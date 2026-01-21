import { useEffect, useState } from 'react';
import { Building, Mail, MapPin, Loader2, LogOut, Filter, Trash2, ShieldCheck, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ApprovalModal from '../../components/ApprovalModal';
import { sendApprovalEmail } from '../../lib/email';

interface Society {
    id: string;
    name: string;
    address: string;
    admin_name: string;
    admin_email: string;
    contact_number: string;
    status: 'pending' | 'approved' | 'rejected';
}

const ExecutiveDashboard = () => {
    const [societies, setSocieties] = useState<Society[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvalModal, setApprovalModal] = useState<{ isOpen: boolean; data: Society | null }>({ isOpen: false, data: null });
    const navigate = useNavigate();

    useEffect(() => {
        fetchSocieties();
    }, []);

    const fetchSocieties = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('societies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setSocieties(data);
        } catch (e: any) {
            console.error("Fetch Error:", e);
            toast.error("Failed to load societies");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
        const loadingToast = toast.loading(newStatus === 'approved' ? 'Approving society...' : 'Declining request...');
        const society = societies.find(s => s.id === id);
        if (!society) return;

        try {
            const { error } = await supabase.from('societies').update({ status: newStatus }).eq('id', id);
            if (error) throw error;

            if (newStatus === 'approved') {
                const tempPassword = (society.contact_number || 'Civora123').trim();
                const createResponse = await fetch('http://localhost:3001/api/create-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: society.admin_email,
                        password: tempPassword,
                        adminName: society.admin_name,
                        societyId: society.id
                    })
                });

                if (!createResponse.ok) {
                    const result = await createResponse.json();
                    throw new Error(result.error || 'Failed to create admin user');
                }

                await sendApprovalEmail(society.admin_email, society.admin_name, tempPassword);
                toast.success('Society approved and admin access granted.', { id: loadingToast });
            } else {
                toast.success('Request declined.', { id: loadingToast });
            }
            fetchSocieties();
        } catch (err: any) {
            toast.error(err.message, { id: loadingToast });
        }
    };

    const handleDeleteSociety = async (society: Society) => {
        if (!window.confirm('This action cannot be undone. All data will be permanently deleted.')) return;
        const loadToast = toast.loading('Removing society...');
        try {
            const response = await fetch('http://localhost:3001/api/delete-society', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ societyId: society.id })
            });
            if (!response.ok) throw new Error('Delete failed');
            toast.success('Society removed.', { id: loadToast });
            fetchSocieties();
        } catch (err: any) {
            toast.error(err.message, { id: loadToast });
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-[#111] font-sans">
            <ApprovalModal
                isOpen={approvalModal.isOpen}
                onClose={() => setApprovalModal({ isOpen: false, data: null })}
                societyName={approvalModal.data?.name || ''}
                adminName={approvalModal.data?.admin_name || ''}
                adminEmail={approvalModal.data?.admin_email || ''}
                tempPassword={approvalModal.data?.contact_number || 'Civora123'}
            />

            {/* Sidebar-style Nav */}
            <div className="flex h-screen overflow-hidden">
                <aside className="w-64 bg-white border-r border-[#e4e4e7] p-6 flex flex-col gap-8 hidden lg:flex">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                            <Building size={14} className="text-white" />
                        </div>
                        <span className="font-bold tracking-tight">CIVORA</span>
                    </div>

                    <nav className="flex flex-col gap-1">
                        <NavItem active icon={<Building size={18} />} label="Societies" />
                        <NavItem icon={<ShieldCheck size={18} />} label="Security" />
                        <NavItem icon={<Globe size={18} />} label="Global Settings" />
                    </nav>

                    <div className="mt-auto">
                        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-sm text-[#71717a] hover:text-black transition-colors w-full p-2 rounded-md hover:bg-[#f4f4f5]">
                            <LogOut size={18} /> Sign Out
                        </button>
                    </div>
                </aside>

                <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <header className="flex justify-between items-end mb-12">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Societies</h1>
                            <p className="text-[#71717a]">Manage society registration requests and system access.</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="resend-button-secondary h-9">
                                <Filter size={14} className="mr-2" /> Filter
                            </button>
                            <button className="resend-button-primary h-9">
                                Export Data
                            </button>
                        </div>
                    </header>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <StatItem label="Pending" value={societies.filter(s => s.status === 'pending').length} />
                        <StatItem label="Approved" value={societies.filter(s => s.status === 'approved').length} />
                        <StatItem label="Rejected" value={societies.filter(s => s.status === 'rejected').length} />
                    </div>

                    {/* Table */}
                    <div className="resend-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="resend-table-header">Society Name</th>
                                        <th className="resend-table-header">Admin Details</th>
                                        <th className="resend-table-header">Status</th>
                                        <th className="resend-table-header text-right px-8">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-[#71717a]">
                                                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                                Loading registry...
                                            </td>
                                        </tr>
                                    ) : societies.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-[#71717a]">
                                                No society records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        societies.map((society) => (
                                            <tr key={society.id} className="resend-table-row">
                                                <td className="px-4 py-4">
                                                    <div className="font-bold text-sm">{society.name}</div>
                                                    <div className="text-xs text-[#71717a] mt-1 flex items-center gap-1">
                                                        <MapPin size={12} /> {society.address}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm">{society.admin_name}</div>
                                                    <div className="text-xs text-[#71717a] mt-1 flex items-center gap-1">
                                                        <Mail size={12} /> {society.admin_email}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${society.status === 'approved' ? 'bg-[#f0fdf4] text-[#166534]' :
                                                        society.status === 'pending' ? 'bg-[#fffbeb] text-[#92400e]' :
                                                            'bg-[#fef2f2] text-[#991b1b]'
                                                        }`}>
                                                        {society.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {society.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusChange(society.id, 'approved')}
                                                                    className="h-8 px-3 bg-[#111] text-white text-[11px] font-bold rounded hover:bg-[#333] transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusChange(society.id, 'rejected')}
                                                                    className="h-8 px-3 border border-[#e4e4e7] text-[11px] font-bold rounded hover:bg-[#fafafa] transition-colors"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteSociety(society)}
                                                            className="p-1.5 text-[#71717a] hover:text-red-600 hover:bg-red-50 transition-colors rounded"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${active ? 'bg-[#f4f4f5] text-black font-medium' : 'text-[#71717a] hover:text-black hover:bg-[#fcfcfc]'
        }`}>
        {icon}
        {label}
    </div>
);

const StatItem = ({ label, value }: { label: string, value: number }) => (
    <div className="bg-white border border-[#e4e4e7] p-6 rounded-xl">
        <div className="text-[#71717a] text-xs font-medium uppercase tracking-wider mb-2">{label}</div>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
);

export default ExecutiveDashboard;
