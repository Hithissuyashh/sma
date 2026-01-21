import React, { useState, useEffect } from 'react';
import { Users, FileText, Wrench, Shield, LogOut, LayoutDashboard, Plus, AlertTriangle, Phone, FileDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { sendApprovalEmail } from '../../lib/email';

// Types
interface ResidentRequest {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    flat_number: string;
    ownership_type: 'owner' | 'rental';
    status: string;
    society_id: string;
    created_at: string;
}

interface WatchmanRequest {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    shift: 'Day' | 'Night';
    status: string;
    society_id: string;
    created_at: string;
}

// RESIDENTS SECTION (Resend UI Style)
const ResidentsSection = ({ societyId }: { societyId?: string }) => {
    const [requests, setRequests] = useState<ResidentRequest[]>([]);
    const [approvedResidents, setApprovedResidents] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, [societyId]);

    const fetchData = async () => {
        if (!societyId) return;
        const { data: reqData } = await supabase.from('resident_requests').select('*').eq('society_id', societyId).eq('status', 'pending');
        const { data: profData } = await supabase.from('profiles').select('*').eq('society_id', societyId).eq('role', 'resident');
        setRequests(reqData || []);
        setApprovedResidents(profData || []);
    };

    const handleApprove = async (request: ResidentRequest) => {
        const loadToast = toast.loading('Processing approval...');
        try {
            const tempPassword = request.phone_number.trim();
            const response = await fetch('http://localhost:3001/api/create-resident', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: request.email,
                    password: tempPassword,
                    fullName: request.full_name,
                    societyId: request.society_id,
                    flatNumber: request.flat_number,
                    ownershipType: request.ownership_type,
                    phoneNumber: request.phone_number
                })
            });
            if (!response.ok) throw new Error('API Error');
            await supabase.from('resident_requests').update({ status: 'approved' }).eq('id', request.id);
            await sendApprovalEmail(request.email, request.full_name, tempPassword);
            toast.success('Approved!', { id: loadToast });
            fetchData();
        } catch (e: any) {
            toast.error('Approval failed', { id: loadToast });
        }
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!window.confirm('Remove this resident?')) return;
        const loadToast = toast.loading('Removing...');
        try {
            const response = await fetch('http://localhost:3001/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email, role: 'resident' })
            });
            if (!response.ok) throw new Error('Delete failed');
            toast.success('Resident removed', { id: loadToast });
            fetchData();
        } catch (e: any) {
            toast.error('Failed to remove');
        }
    };

    return (
        <div className="space-y-12">
            {/* Pending Requests Table */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Access Requests</h2>
                        <p className="text-sm text-[#71717a]">New residents waiting for society access approval.</p>
                    </div>
                </div>

                <div className="resend-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="resend-table-header">Resident</th>
                                <th className="resend-table-header">Unit</th>
                                <th className="resend-table-header">Ownership</th>
                                <th className="resend-table-header text-right px-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-sm text-[#71717a]">No pending requests</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="resend-table-row text-sm">
                                        <td className="px-4 py-3">
                                            <div className="font-bold">{req.full_name}</div>
                                            <div className="text-xs text-[#71717a]">{req.email}</div>
                                        </td>
                                        <td className="px-4 py-3">{req.flat_number}</td>
                                        <td className="px-4 py-3 capitalize">{req.ownership_type}</td>
                                        <td className="px-4 py-3 text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleApprove(req)} className="h-8 px-3 bg-black text-white text-[11px] font-bold rounded">Approve</button>
                                                <button className="h-8 px-3 border border-[#e4e4e7] text-[11px] font-bold rounded">Decline</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registry Table */}
            <div>
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Resident Registry</h2>
                        <p className="text-sm text-[#71717a]">All active residents in the society.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="resend-button-secondary h-8 hover:bg-[#fafafa]">
                            <FileDown size={14} className="mr-2" /> Export
                        </button>
                    </div>
                </div>

                <div className="resend-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="resend-table-header">Resident</th>
                                <th className="resend-table-header">Unit</th>
                                <th className="resend-table-header">Contact</th>
                                <th className="resend-table-header text-right px-8">Manage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvedResidents.map(res => (
                                <tr key={res.id} className="resend-table-row text-sm">
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{res.full_name}</div>
                                        <div className="text-[10px] text-[#71717a] uppercase tracking-wider">{res.ownership_type}</div>
                                    </td>
                                    <td className="px-4 py-3">{res.flat_number}</td>
                                    <td className="px-4 py-3">
                                        <div>{res.phone_number}</div>
                                        <div className="text-[10px] text-[#71717a] font-mono">PW: {res.phone_number}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right pr-6">
                                        <button onClick={() => handleDeleteUser(res.id, res.email)} className="p-1.5 text-[#71717a] hover:text-red-600 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// WATCHMAN SECTION (Resend UI Style)
const WatchmanSection = ({ societyId }: { societyId?: string }) => {
    const [requests, setRequests] = useState<WatchmanRequest[]>([]);
    const [approvedWatchmen, setApprovedWatchmen] = useState<any[]>([]);

    useEffect(() => { fetchData(); }, [societyId]);

    const fetchData = async () => {
        if (!societyId) return;
        const { data: reqData } = await supabase.from('watchman_requests').select('*').eq('society_id', societyId).eq('status', 'pending');
        const { data: profData } = await supabase.from('profiles').select('*').eq('society_id', societyId).eq('role', 'watchman');
        setRequests(reqData || []);
        setApprovedWatchmen(profData || []);
    };

    const handleApprove = async (request: WatchmanRequest) => {
        const loadToast = toast.loading('Processing approval...');
        try {
            const tempPassword = request.phone_number.trim();
            const response = await fetch('http://localhost:3001/api/create-watchman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: request.email,
                    password: tempPassword,
                    fullName: request.full_name,
                    societyId: request.society_id,
                    shift: request.shift,
                    phoneNumber: request.phone_number
                })
            });
            if (!response.ok) throw new Error('API Error');
            await supabase.from('watchman_requests').update({ status: 'approved' }).eq('id', request.id);
            await sendApprovalEmail(request.email, request.full_name, tempPassword);
            toast.success('Approved!', { id: loadToast });
            fetchData();
        } catch (e: any) { toast.error('Approval failed', { id: loadToast }); }
    };

    const handleDeleteUser = async (userId: string, email: string) => {
        if (!window.confirm('Remove this security staff?')) return;
        const loadToast = toast.loading('Removing...');
        try {
            const response = await fetch('http://localhost:3001/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, email, role: 'watchman' })
            });
            if (!response.ok) throw new Error('Delete failed');
            toast.success('Removed', { id: loadToast });
            fetchData();
        } catch (e: any) { toast.error('Failed to remove'); }
    };

    return (
        <div className="space-y-12">
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-6">Staff Requests</h2>
                <div className="resend-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="resend-table-header">Name</th>
                                <th className="resend-table-header">Shift</th>
                                <th className="resend-table-header text-right px-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr><td colSpan={3} className="p-8 text-center text-sm text-[#71717a]">No pending requests</td></tr>
                            ) : (
                                requests.map(req => (
                                    <tr key={req.id} className="resend-table-row text-sm">
                                        <td className="px-4 py-3 font-bold">{req.full_name}</td>
                                        <td className="px-4 py-3">{req.shift}</td>
                                        <td className="px-4 py-3 text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleApprove(req)} className="h-8 px-3 bg-black text-white text-[11px] font-bold rounded">Approve</button>
                                                <button className="h-8 px-3 border border-[#e4e4e7] text-[11px] font-bold rounded">Decline</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold tracking-tight mb-6">Security Roster</h2>
                <div className="resend-card overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="resend-table-header">Staff Name</th>
                                <th className="resend-table-header">Shift</th>
                                <th className="resend-table-header">Contact</th>
                                <th className="resend-table-header text-right px-8">Manage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvedWatchmen.map(res => (
                                <tr key={res.id} className="resend-table-row text-sm">
                                    <td className="px-4 py-3 font-bold">{res.full_name}</td>
                                    <td className="px-4 py-3">{res.shift}</td>
                                    <td className="px-4 py-3">{res.phone_number}</td>
                                    <td className="px-4 py-3 text-right pr-6">
                                        <button onClick={() => handleDeleteUser(res.id, res.email)} className="p-1.5 text-[#71717a] hover:text-red-600 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// OVERVIEW SECTION
const OverviewSection = ({ societyId, onAction }: { societyId?: string, onAction?: (tab: string) => void }) => {
    const [stats, setStats] = useState({ residents: 0, pendingRes: 0, pendingWatch: 0, tickets: 0, scale: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            if (!societyId) return;
            const { count: residents } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('role', 'resident');
            const { count: pendingRes } = await supabase.from('resident_requests').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('status', 'pending');
            const { count: pendingWatch } = await supabase.from('watchman_requests').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('status', 'pending');
            const { count: tickets } = await supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('society_id', societyId).eq('status', 'open');

            // Calculate real revenue
            const { data: payments } = await supabase
                .from('maintenance_records')
                .select('amount')
                .eq('status', 'paid');

            const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

            setStats({
                residents: residents || 0,
                pendingRes: pendingRes || 0,
                pendingWatch: pendingWatch || 0,
                tickets: tickets || 0,
                scale: totalRevenue
            });
        };
        fetchStats();
    }, [societyId]);

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <OverviewStat label="Active Residents" value={stats.residents} />
                <OverviewStat label="Access Requests" value={stats.pendingRes + stats.pendingWatch} />
                <OverviewStat label="Open Tickets" value={stats.tickets} />
                <OverviewStat label="Monthly Revenue" value={`₹${stats.scale.toLocaleString()} `} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#71717a]">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <ActionButton icon={<FileText size={18} />} label="Post Notice" onClick={() => onAction?.('notices')} />
                        <ActionButton icon={<Phone size={18} />} label="Set Emergency" onClick={() => onAction?.('emergency')} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#71717a]">Active Tickets</h3>
                    <div className="resend-card p-8 flex flex-col items-center justify-center text-center">
                        <AlertTriangle className="text-[#e4e4e7] mb-2" size={32} />
                        <p className="text-xs text-[#71717a]">Internal monitoring operational.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OverviewStat = ({ label, value }: { label: string, value: any }) => (
    <div className="bg-white border border-[#e4e4e7] p-6 rounded-xl">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] mb-1">{label}</div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
);

const ActionButton = ({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-3 p-4 bg-white border border-[#e4e4e7] rounded-xl hover:bg-[#fafafa] transition-colors text-sm font-medium w-full">
        <div className="w-8 h-8 rounded bg-[#fafafa] flex items-center justify-center border border-[#e4e4e7]">{icon}</div>
        {label}
    </button>
);


const NoticesSection = ({ societyId }: { societyId?: string }) => {
    const [notices, setNotices] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '' });

    useEffect(() => { fetchNotices(); }, [societyId]);

    const fetchNotices = async () => {
        if (!societyId) return;
        const { data } = await supabase.from('notices').select('*').eq('society_id', societyId).order('created_at', { ascending: false });
        if (data) setNotices(data);
    };

    const handlePostNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadToast = toast.loading('Posting...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('profiles').select('society_id').eq('id', user?.id).single();
            await supabase.from('notices').insert({
                title: formData.title,
                content: formData.content,
                society_id: profile?.society_id,
                author_id: user?.id
            });
            toast.success('Notice posted', { id: loadToast });
            setShowModal(false);
            setFormData({ title: '', content: '' });
            fetchNotices();
        } catch (e: any) { toast.error('Failed to post', { id: loadToast }); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Community Notices</h2>
                    <p className="text-sm text-[#71717a]">Broadcast updates to all residents.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="resend-button-primary h-8">
                    <Plus size={14} className="mr-2" /> New Notice
                </button>
            </div>

            <div className="resend-card divide-y divide-[#e4e4e7]">
                {notices.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[#71717a]">No notices yet</div>
                ) : (
                    notices.map(notice => (
                        <div key={notice.id} className="p-6 hover:bg-[#fafafa] transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold">{notice.title}</h3>
                                <span className="text-[10px] text-[#71717a] font-mono">
                                    {new Date(notice.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-[#71717a] leading-relaxed max-w-2xl">{notice.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Post Modal - Resend Style Minimal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                    <div className="bg-white border border-[#e4e4e7] rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-6">New Notice</h2>
                        <form onSubmit={handlePostNotice} className="space-y-4">
                            <div>
                                <label className="resend-label">Title</label>
                                <input
                                    required
                                    className="resend-input"
                                    placeholder="Important Announcement"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="resend-label">Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="resend-input"
                                    placeholder="Brief details..."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="resend-button-primary flex-1">Post Notice</button>
                                <button type="button" onClick={() => setShowModal(false)} className="resend-button-secondary flex-1">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const ComplaintsSection = ({ societyId }: { societyId?: string }) => {
    const [tickets, setTickets] = useState<any[]>([]);

    useEffect(() => { fetchTickets(); }, [societyId]);

    const fetchTickets = async () => {
        if (!societyId) return;
        const { data } = await supabase.from('complaints').select('*, profiles(full_name, flat_number)').eq('society_id', societyId).order('created_at', { ascending: false });
        if (data) setTickets(data);
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await supabase.from('complaints').update({ status: newStatus }).eq('id', id);
            toast.success(`Marked as ${newStatus} `);
            fetchTickets();
        } catch (e) { toast.error('Failed to update'); }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xl font-bold tracking-tight mb-6">Service Tickets</h2>
                <div className="resend-card overflow-hidden">
                    <table className="w-full text-left font-sans">
                        <thead>
                            <tr>
                                <th className="resend-table-header">Issue</th>
                                <th className="resend-table-header">Category</th>
                                <th className="resend-table-header">Status</th>
                                <th className="resend-table-header text-right px-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="resend-table-row text-sm">
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{ticket.title}</div>
                                        <div className="text-[10px] text-[#71717a]">{ticket.profiles?.full_name} • {ticket.profiles?.flat_number}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">{ticket.category}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        <span className={`px-2 py-0.5 rounded font-medium ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                                            ticket.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {ticket.status.replace('-', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right pr-6">
                                        <div className="flex justify-end gap-2 text-[10px]">
                                            {ticket.status === 'open' && (
                                                <button onClick={() => handleStatusUpdate(ticket.id, 'in-progress')} className="font-bold hover:underline">Start</button>
                                            )}
                                            {ticket.status === 'in-progress' && (
                                                <button onClick={() => handleStatusUpdate(ticket.id, 'resolved')} className="font-bold hover:underline text-emerald-600">Resolve</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// FINANCE SECTION
const FinanceSection = ({ societyId }: { societyId?: string }) => {
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);

    useEffect(() => { fetchPending(); }, [societyId]);

    const fetchPending = async () => {
        if (!societyId) return;
        const { data } = await supabase
            .from('maintenance_records')
            .select('*, profiles(full_name, flat_number)')
            .eq('status', 'pending')
            .order('updated_at', { ascending: false });
        if (data) setPendingPayments(data);
    };

    const handleApprove = async (id: string) => {
        const loadToast = toast.loading('Confirming payment...');
        try {
            const { error } = await supabase
                .from('maintenance_records')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast.success('Payment verified!', { id: loadToast });
            fetchPending();
        } catch (e) { toast.error('Verification failed'); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Financial Clearances</h2>
                    <p className="text-sm text-[#71717a]">Approve and verify resident maintenance payments.</p>
                </div>
            </div>

            <div className="resend-card overflow-hidden">
                <table className="w-full text-left font-sans">
                    <thead>
                        <tr>
                            <th className="resend-table-header">Resident</th>
                            <th className="resend-table-header">Amount</th>
                            <th className="resend-table-header">Date</th>
                            <th className="resend-table-header text-right px-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingPayments.length === 0 ? (
                            <tr><td colSpan={4} className="p-12 text-center text-sm text-[#71717a] italic">No pending clearances.</td></tr>
                        ) : (
                            pendingPayments.map(p => (
                                <tr key={p.id} className="resend-table-row text-sm">
                                    <td className="px-4 py-3">
                                        <div className="font-bold">{p.profiles?.full_name}</div>
                                        <div className="text-[10px] text-[#71717a]">Unit {p.profiles?.flat_number}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono">₹{p.amount?.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-[10px] text-[#71717a]">
                                        {new Date(p.updated_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right pr-6">
                                        <button onClick={() => handleApprove(p.id)} className="resend-button-primary h-8 px-4 text-[10px] font-bold">Approve</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// EMERGENCY SECTION (Resend Style)
const EmergencySection = ({ societyId }: { societyId?: string }) => {
    const [contacts, setContacts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', type: 'Other' });

    useEffect(() => {
        fetchContacts();
    }, [societyId]);

    const fetchContacts = async () => {
        if (!societyId) return;
        const { data } = await supabase.from('emergency_contacts').select('*').eq('society_id', societyId);
        if (data) setContacts(data);
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadToast = toast.loading('Adding contact...');
        try {
            await supabase.from('emergency_contacts').insert({
                name: formData.name,
                phone_number: formData.phone,
                contact_type: formData.type,
                society_id: societyId
            });
            toast.success('Contact added', { id: loadToast });
            setShowModal(false);
            setFormData({ name: '', phone: '', type: 'Other' });
            fetchContacts();
        } catch (e) { toast.error('Failed to add'); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Emergency Contacts</h2>
                    <p className="text-sm text-[#71717a]">Quick access to critical services.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="resend-button-primary h-8">
                    <Plus size={14} className="mr-2" /> Add Contact
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contacts.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-sm text-[#71717a] resend-card italic">No emergency records.</div>
                ) : (
                    contacts.map(contact => (
                        <div key={contact.id} className="resend-card p-6 flex flex-col gap-4 three-d-hover">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#fef2f2] border border-[#fecaca] rounded-lg flex items-center justify-center">
                                    <Phone size={18} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{contact.name}</h3>
                                    <p className="text-[10px] text-[#71717a] uppercase tracking-wider">{contact.contact_type}</p>
                                </div>
                            </div>
                            <div className="text-lg font-bold tracking-tight font-mono">{contact.phone_number}</div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                    <div className="bg-white border border-[#e4e4e7] rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-6">Add Contact</h2>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div>
                                <label className="resend-label">Name</label>
                                <input required className="resend-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="resend-label">Phone</label>
                                <input required className="resend-input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="resend-label">Type</label>
                                <select className="resend-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option>Police</option>
                                    <option>Fire</option>
                                    <option>Ambulance</option>
                                    <option>Maintenance</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="resend-button-primary flex-1">Save Contact</button>
                                <button type="button" onClick={() => setShowModal(false)} className="resend-button-secondary flex-1">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// MAINTENANCE & DOCUMENTS (Combined for brevity in Resend style)
const ResourceSection = ({ societyId }: { societyId?: string }) => {
    const [resources, setResources] = useState<any[]>([]);
    const [revenue, setRevenue] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', type: 'PDF' });

    useEffect(() => {
        fetchResources();
        fetchRevenue();
    }, [societyId]);

    const fetchResources = async () => {
        if (!societyId) return;
        const { data } = await supabase.from('resources').select('*').eq('society_id', societyId);
        if (data) setResources(data);
    };

    const fetchRevenue = async () => {
        const { data } = await supabase
            .from('maintenance_records')
            .select('amount')
            .eq('status', 'paid');
        const total = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        setRevenue(total);
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadToast = toast.loading('Adding resource...');
        try {
            await supabase.from('resources').insert({
                name: formData.name,
                type: formData.type,
                society_id: societyId,
                file_url: '#' // Placeholder for actual file upload logic
            });
            toast.success('Resource added', { id: loadToast });
            setShowModal(false);
            setFormData({ name: '', type: 'PDF' });
            fetchResources();
        } catch (e) { toast.error('Failed to add'); }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#09090b]">Resources & Maintenance</h2>
                    <p className="text-sm text-[#71717a]">Manage society documents and finance logs.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="resend-button-primary h-8">
                    <Plus size={14} className="mr-2" /> Add Resource
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm">
                <div className="three-d-hover">
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-[#71717a] mb-6">Real-time Revenue</h2>
                        <div className="resend-card p-12 text-center bg-black text-white">
                            <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">Total Collections</div>
                            <div className="text-5xl font-bold tracking-tighter">₹{revenue.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
                <div className="three-d-hover">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[#71717a] mb-6">Repository</h2>
                    <div className="resend-card divide-y divide-[#e4e4e7]">
                        {resources.length === 0 ? (
                            <div className="p-12 text-center text-[#71717a] italic">No resources uploaded.</div>
                        ) : (
                            resources.map(res => (
                                <div key={res.id} className="p-4 flex justify-between items-center hover:bg-[#fafafa] cursor-pointer">
                                    <span>{res.name}</span>
                                    <FileText size={14} className="text-[#71717a]" />
                                </div>
                            ))
                        )}
                        <div className="p-4 flex justify-between items-center hover:bg-[#fafafa] cursor-pointer">
                            <span>Society Bylaws.pdf</span>
                            <FileText size={14} className="text-[#71717a]" />
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                    <div className="bg-white border border-[#e4e4e7] rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h2 className="text-lg font-bold mb-6">Add Resource</h2>
                        <form onSubmit={handleAddResource} className="space-y-4">
                            <div>
                                <label className="resend-label">Title</label>
                                <input required className="resend-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="resend-label">Type</label>
                                <select className="resend-input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option>PDF</option>
                                    <option>Image</option>
                                    <option>Document</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="resend-button-primary flex-1">Save Resource</button>
                                <button type="button" onClick={() => setShowModal(false)} className="resend-button-secondary flex-1">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// MAIN DASHBOARD COMPONENT
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [userProfile, setUserProfile] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setUserProfile(data);
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white">
            {/* Sidebar */}
            <div className="fixed left-0 top-0 bottom-0 w-64 border-r border-[#e4e4e7] bg-white p-4 hidden md:flex flex-col">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-[12px] font-bold">C</div>
                    <span className="font-bold text-sm tracking-tight text-black">CIVORA</span>
                </div>

                <nav className="flex-1 space-y-1">
                    <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard size={18} />} label="Overview" />
                    <NavItem active={activeTab === 'residents'} onClick={() => setActiveTab('residents')} icon={<Users size={18} />} label="Residents" />
                    <NavItem active={activeTab === 'watchman'} onClick={() => setActiveTab('watchman')} icon={<Shield size={18} />} label="Security" />
                    <NavItem active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} icon={<FileText size={18} />} label="Notices" />
                    <NavItem active={activeTab === 'finances'} onClick={() => setActiveTab('finances')} icon={<FileDown size={18} />} label="Finances" />
                    <NavItem active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={<AlertTriangle size={18} />} label="Tickets" />
                    <NavItem active={activeTab === 'emergency'} onClick={() => setActiveTab('emergency')} icon={<Phone size={18} />} label="Emergency" />
                    <NavItem active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<Wrench size={18} />} label="Resources" />
                </nav>

                <div className="pt-4 border-t border-[#e4e4e7]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 w-full text-sm text-[#71717a] hover:text-black transition-colors rounded-md"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="md:ml-64 p-8 lg:p-12 max-w-6xl">
                <header className="mb-12 border-b border-[#e4e4e7] pb-8">
                    <h1 className="text-2xl font-bold tracking-tighter">Admin Dashboard</h1>
                    <p className="text-[#71717a] text-sm mt-1">Manage society operations and resident requests.</p>
                </header>

                <div className="animate-in fade-in duration-500">
                    {activeTab === 'overview' && <OverviewSection societyId={userProfile?.society_id} onAction={setActiveTab} />}
                    {activeTab === 'residents' && <ResidentsSection societyId={userProfile?.society_id} />}
                    {activeTab === 'watchman' && <WatchmanSection societyId={userProfile?.society_id} />}
                    {activeTab === 'notices' && <NoticesSection societyId={userProfile?.society_id} />}
                    {activeTab === 'tickets' && <ComplaintsSection societyId={userProfile?.society_id} />}
                    {activeTab === 'finances' && <FinanceSection societyId={userProfile?.society_id} />}
                    {activeTab === 'emergency' && <EmergencySection societyId={userProfile?.society_id} />}
                    {activeTab === 'resources' && <ResourceSection societyId={userProfile?.society_id} />}
                </div>
            </main>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 w-full text-sm rounded-md transition-colors ${active ? 'bg-[#f4f4f5] text-black font-medium' : 'text-[#71717a] hover:text-black hover:bg-[#fafafa]'
            }`}
    >
        {icon}
        {label}
    </button>
);

export default AdminDashboard;
