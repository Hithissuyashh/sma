import { useState, useEffect } from 'react';
import { Home, LogOut, MessageSquare, Phone, Send, X, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ResidentDashboard = () => {
    const navigate = useNavigate();
    const [ticketMessage, setTicketMessage] = useState('');
    const [tickets, setTickets] = useState<any[]>([]);
    const [notices, setNotices] = useState<any[]>([]);
    const [visitorRequest, setVisitorRequest] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [isRaising, setIsRaising] = useState(false);
    const [stats, setStats] = useState({ maintenance: 'Unpaid', contactsCount: 0 });
    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [feedbackData, setFeedbackData] = useState({ rating: 5, feedback: '' });
    const [activeTab, setActiveTab] = useState('home');
    const [isCompletingProfile, setIsCompletingProfile] = useState(false);
    const [profileFormData, setProfileFormData] = useState({ flat_number: '', phone_number: '' });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!userProfile?.id) return;

        let cleanup: (() => void) | undefined;
        setupRealtimeListener(userProfile.id).then(unsubscribe => {
            cleanup = unsubscribe;
        });

        const interval = setInterval(() => fetchVisitorUpdate(true), 10000); // Silent fallback

        return () => {
            cleanup?.();
            clearInterval(interval);
        };
    }, [userProfile?.id]);

    const fetchVisitorUpdate = async (isSilent = false) => {
        if (!userProfile?.id) return;

        // 1. Try by ID (Strict)
        let { data, error } = await supabase
            .from('visitor_requests')
            .select('*')
            .eq('resident_id', userProfile.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Fallback to Flat Number in same society (Flexible)
        if (!data && !error && userProfile.flat_number) {
            const { data: fallbackData } = await supabase
                .from('visitor_requests')
                .select('*')
                .eq('society_id', userProfile.society_id)
                .ilike('flat_number', userProfile.flat_number)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            data = fallbackData;
        }

        if (data) {
            setVisitorRequest(data);
            if (!isSilent) toast.success(`Found visitor: ${data.visitor_name}`);
        } else {
            setVisitorRequest(null);
            if (!isSilent) {
                if (error) toast.error("Sync error. Try again.");
                else toast.success(`No pending visitors for Unit ${userProfile.flat_number || 'N/A'}`);
            }
        }
    };

    const fetchInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

        if (profile) {
            const { data: noticesData } = await supabase.from('notices').select('*').eq('society_id', profile.society_id).order('created_at', { ascending: false });
            setNotices(noticesData || []);

            const { data: ticketsData } = await supabase.from('complaints').select('*').eq('resident_id', user.id).order('created_at', { ascending: false });
            setTickets(ticketsData || []);

            const { data: contacts, count } = await supabase.from('emergency_contacts').select('*', { count: 'exact' }).eq('society_id', profile.society_id);
            setEmergencyContacts(contacts || []);

            const { data: maint } = await supabase.from('maintenance_records').select('status').eq('resident_id', user.id).order('created_at', { ascending: false }).limit(1).single();
            setStats({ maintenance: maint?.status || 'Unpaid', contactsCount: count || 0 });

            // Fetch any existing pending visitor requests
            const { data: pendingVisitors } = await supabase
                .from('visitor_requests')
                .select('*')
                .eq('resident_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingVisitors) {
                setVisitorRequest(pendingVisitors);
            }

            // Trigger profile completion if unit is missing
            if (!profile.flat_number) {
                setProfileFormData({
                    flat_number: '',
                    phone_number: profile.phone_number || ''
                });
                setIsCompletingProfile(true);
            }
        }
    };

    const setupRealtimeListener = async (userId: string) => {
        const channel = supabase
            .channel(`resident_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'visitor_requests'
            }, (payload) => {
                const updatedRequest = payload.new as any;
                const isForMe = updatedRequest.resident_id === userId ||
                    (updatedRequest.society_id === userProfile?.society_id &&
                        updatedRequest.flat_number?.toLowerCase() === userProfile?.flat_number?.toLowerCase());

                if (isForMe) {
                    if (updatedRequest.status === 'pending') {
                        setVisitorRequest(updatedRequest);
                        if (payload.eventType === 'INSERT') {
                            toast('New Visitor Request!', { icon: '🚪' });
                        }
                    } else {
                        setVisitorRequest(null);
                    }
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const handleRaiseTicket = async () => {
        if (!ticketMessage.trim() || !userProfile) return;
        setIsRaising(true);
        const loadToast = toast.loading('AI is analyzing your request...');

        // Simple AI Simulation (Keyword based)
        let category = 'General';
        let priority = 'medium';
        const msg = ticketMessage.toLowerCase();

        if (msg.includes('water') || msg.includes('leak') || msg.includes('tap')) category = 'Plumbing';
        else if (msg.includes('light') || msg.includes('power') || msg.includes('electricity') || msg.includes('shock')) category = 'Electrical';
        else if (msg.includes('lift') || msg.includes('elevator')) category = 'Elevator';
        else if (msg.includes('security') || msg.includes('stranger') || msg.includes('noise')) category = 'Security';
        else if (msg.includes('clean') || msg.includes('garbage') || msg.includes('trash')) category = 'Sanitation';

        if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('danger') || msg.includes('immediate') || msg.includes('broken')) priority = 'high';

        try {
            const { error } = await supabase.from('complaints').insert({
                title: ticketMessage.substring(0, 40) + (ticketMessage.length > 40 ? '...' : ''),
                description: ticketMessage,
                resident_id: userProfile.id,
                society_id: userProfile.society_id,
                category,
                priority,
                status: 'open'
            });

            if (error) throw error;
            toast.success(`Smart AI Categorized as ${category}!`, { id: loadToast });
            setTicketMessage('');
            fetchInitialData();
        } catch (error: any) {
            console.error('Ticket error:', error);
            toast.error('Failed to raise ticket', { id: loadToast });
        } finally {
            setIsRaising(false);
        }
    };

    const handleSOS = async () => {
        if (!userProfile) return;
        const loadToast = toast.loading('Sending Emergency Signal...');
        try {
            await supabase.from('security_alerts').insert({
                resident_id: userProfile.id,
                society_id: userProfile.society_id,
                flat_number: userProfile.flat_number,
                type: 'SOS',
                status: 'active'
            });
            toast.success('SOS Signal Sent to Security!', { id: loadToast });
        } catch (error) {
            toast.error('Failed to send SOS');
        }
    };

    const handleSubmittingFeedback = async () => {
        if (!selectedTicket) return;
        const loadToast = toast.loading('Submitting feedback...');
        try {
            await supabase.from('complaints').update({
                satisfaction_rating: feedbackData.rating,
                resident_feedback: feedbackData.feedback,
                status: 'closed'
            }).eq('id', selectedTicket.id);

            toast.success('Thank you!', { id: loadToast });
            setSelectedTicket(null);
            fetchInitialData();
        } catch (error) { toast.error('Failed to submit', { id: loadToast }); }
    };

    const handleVisitorApproval = async (status: 'approved' | 'declined') => {
        if (!visitorRequest) return;
        const loadToast = toast.loading(`${status === 'approved' ? 'Approving' : 'Declining'}...`);
        try {
            await supabase.from('visitor_requests').update({ status }).eq('id', visitorRequest.id);
            toast.success(`Visitor ${status}`, { id: loadToast });
            setVisitorRequest(null);
        } catch (error) { toast.error('Update failed', { id: loadToast }); }
    };

    const handlePayMaintenance = async () => {
        if (!userProfile) return;
        const loadToast = toast.loading('Opening gateway...');
        await new Promise(r => setTimeout(r, 800));
        try {
            await supabase.from('maintenance_records').insert({
                resident_id: userProfile.id,
                society_id: userProfile.society_id,
                month: new Date().toLocaleString('default', { month: 'long' }),
                year: new Date().getFullYear(),
                amount: 2500,
                status: 'paid'
            });
            toast.success('Payment successful', { id: loadToast });
            fetchInitialData();
        } catch (error) { toast.error('Payment failed', { id: loadToast }); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleCompleteProfile = async () => {
        if (!profileFormData.flat_number || !userProfile) return;
        const loadToast = toast.loading('Updating profile...');
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    flat_number: profileFormData.flat_number,
                    phone_number: profileFormData.phone_number
                })
                .eq('id', userProfile.id);

            if (error) throw error;
            toast.success('Profile updated!', { id: loadToast });
            setIsCompletingProfile(false);
            fetchInitialData();
        } catch (error) { toast.error('Update failed', { id: loadToast }); }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white">
            {/* Sidebar with Parallax Effect Support */}
            <div className="fixed left-0 top-0 bottom-0 w-64 border-r border-[#e4e4e7] bg-white p-4 hidden md:flex flex-col z-40">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-6 h-6 premium-gradient-bg rounded flex items-center justify-center text-white text-[12px] font-bold">C</div>
                    <span className="font-bold text-sm tracking-tight premium-gradient-text">CIVORA</span>
                </div>

                <nav className="flex-1 space-y-1">
                    <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={18} />} label="Dashboard" />
                    <NavItem active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon={<MessageSquare size={18} />} label="My Tickets" />
                    <NavItem active={activeTab === 'emergency'} onClick={() => setActiveTab('emergency')} icon={<Phone size={18} />} label="Emergency" />
                </nav>

                <div className="space-y-4 pt-4 border-t border-[#e4e4e7]">
                    <button
                        onClick={handleSOS}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Shield size={16} /> SOS SIGNAL
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2 w-full text-sm text-[#71717a] hover:text-black transition-colors rounded-md"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <main className="md:ml-64 p-8 lg:p-12 max-w-5xl">
                <header className="mb-12 border-b border-[#e4e4e7] pb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tighter">My Resident Portal</h1>
                        <p className="text-[#71717a] text-sm mt-1">{userProfile?.full_name} • Unit {userProfile?.flat_number || 'N/A'}</p>
                    </div>
                    <button
                        onClick={() => {
                            fetchVisitorUpdate(false);
                        }}
                        className="h-8 px-4 border border-[#e4e4e7] hover:bg-[#fafafa] rounded text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        Sync Gate
                    </button>
                </header>

                {/* Persistent Gate Access Section */}
                {visitorRequest && (
                    <div className="mb-12 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-black text-white p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Shield size={80} />
                            </div>
                            <div className="text-center md:text-left z-10">
                                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-2">Security Protocol Active</div>
                                <h2 className="text-2xl font-bold mb-1">Gate Authorization</h2>
                                <p className="text-sm text-gray-400">
                                    <span className="font-bold text-white">{visitorRequest.visitor_name}</span> is requesting entry for <span className="italic">{visitorRequest.purpose}</span>.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto z-10">
                                <button
                                    onClick={() => handleVisitorApproval('approved')}
                                    className="bg-white text-black px-8 h-12 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                                >
                                    Approve Entry
                                </button>
                                <button
                                    onClick={() => handleVisitorApproval('declined')}
                                    className="bg-red-600/20 text-red-500 border border-red-500/30 px-8 h-12 rounded-xl font-bold text-sm hover:bg-red-600/30 transition-all active:scale-95 text-center"
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    {activeTab === 'home' && (
                        <div className="space-y-12">
                            {/* Warning for Missing Unit */}
                            {!userProfile?.flat_number && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 animate-pulse">
                                    <AlertCircle className="text-amber-600 shrink-0" size={18} />
                                    <div>
                                        <div className="text-sm font-bold text-amber-900">Unit Number Missing</div>
                                        <p className="text-xs text-amber-700">Security cannot send you visitor requests until your Unit/Flat number is set in your profile.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white border border-[#e4e4e7] p-6 rounded-xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] mb-1">Maintenance</div>
                                        {stats.maintenance === 'paid' ? (
                                            <span className="text-xl font-bold text-emerald-600">PAID</span>
                                        ) : stats.maintenance === 'pending' ? (
                                            <span className="text-xl font-bold text-amber-500">PENDING APPROVAL</span>
                                        ) : (
                                            <button onClick={handlePayMaintenance} className="resend-button-primary h-10 px-6">Pay Now</button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white border border-[#e4e4e7] p-6 rounded-xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] mb-1">Security Alert</div>
                                        <div className="text-2xl font-bold tracking-tight">{stats.contactsCount} Protocols Active</div>
                                    </div>
                                    <button onClick={() => setActiveTab('emergency')} className="resend-button-secondary h-8 px-4 text-xs font-bold rounded">View SOS</button>
                                </div>
                            </div>


                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-[#71717a] mb-6">Latest Notices</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {notices.length === 0 ? (
                                        <div className="col-span-full p-12 text-center text-[#71717a] resend-card italic">No society announcements.</div>
                                    ) : (
                                        notices.map(notice => (
                                            <div key={notice.id} className="resend-card glass-card p-6 three-d-hover">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="font-bold text-sm">{notice.title}</h3>
                                                    <span className="text-[10px] text-[#71717a] font-mono">{new Date(notice.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-[#71717a] leading-relaxed line-clamp-3">{notice.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tickets' && (
                        <div className="space-y-12">
                            <div className="resend-card p-8 glass-card">
                                <h2 className="text-lg font-bold mb-4">Request Service</h2>
                                <div className="relative">
                                    <textarea
                                        className="resend-input min-h-[100px] pt-4 pr-12"
                                        placeholder="Briefly describe the maintenance issue..."
                                        value={ticketMessage}
                                        onChange={(e) => setTicketMessage(e.target.value)}
                                    />
                                    <button
                                        onClick={handleRaiseTicket}
                                        disabled={isRaising || !ticketMessage.trim()}
                                        className="absolute right-4 bottom-4 p-2 bg-black text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-[#71717a] mb-6">Your Tickets</h2>
                                <div className="grid gap-4">
                                    {tickets.length === 0 ? (
                                        <div className="p-12 text-center text-[#71717a] resend-card italic">No tickets raised.</div>
                                    ) : (
                                        tickets.map(t => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTicket(t)}
                                                className="bg-white border border-[#e4e4e7] p-5 rounded-xl hover:border-black/20 cursor-pointer transition-all flex justify-between items-center shadow-sm"
                                            >
                                                <div>
                                                    <div className="font-bold">{t.title}</div>
                                                    <div className="text-[10px] text-[#71717a] mt-1 uppercase font-bold tracking-widest flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                                        {t.status} • {new Date(t.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                {t.status === 'resolved' && !t.satisfaction_rating && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">FEEDBACK REQUIRED</span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'emergency' && (
                        <div className="space-y-8 max-w-2xl">
                            <h2 className="text-lg font-bold">Emergency Network</h2>
                            <div className="space-y-3">
                                {emergencyContacts.length === 0 ? (
                                    <div className="p-12 text-center text-[#71717a] resend-card italic">No emergency contacts listed.</div>
                                ) : (
                                    emergencyContacts.map(contact => (
                                        <div key={contact.id} className="bg-white border border-[#e4e4e7] p-4 rounded-xl flex justify-between items-center shadow-sm">
                                            <div>
                                                <div className="font-bold text-sm">{contact.name}</div>
                                                <div className="text-[10px] text-[#71717a] font-bold tracking-widest uppercase">{contact.contact_type}</div>
                                            </div>
                                            <a href={`tel:${contact.phone_number}`} className="h-8 px-4 border border-[#e4e4e7] hover:bg-[#fafafa] rounded text-xs font-bold flex items-center gap-2">
                                                <Phone size={12} /> Call Now
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Feedback Modal */}
                {selectedTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                        <div className="bg-white border border-[#e4e4e7] rounded-xl p-8 w-full max-w-md shadow-2xl relative">
                            <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 text-[#71717a] hover:text-black">
                                <X size={20} />
                            </button>
                            <div className="text-[10px] font-bold text-[#71717a] uppercase tracking-widest mb-1">{selectedTicket.category} • {selectedTicket.status}</div>
                            <h2 className="text-xl font-bold mb-2">{selectedTicket.title}</h2>
                            <p className="text-sm text-[#71717a] mb-8">{selectedTicket.description}</p>

                            {selectedTicket.status === 'resolved' && !selectedTicket.satisfaction_rating && (
                                <div className="space-y-4 pt-4 border-t border-[#e4e4e7]">
                                    <div className="flex justify-center gap-2 mb-4">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                                                className={`text-2xl ${feedbackData.rating >= star ? 'text-black' : 'text-[#e4e4e7]'}`}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className="resend-input min-h-[80px]"
                                        placeholder="Any feedback for the maintenance team?"
                                        value={feedbackData.feedback}
                                        onChange={e => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                                    />
                                    <button onClick={handleSubmittingFeedback} className="resend-button-primary w-full">Close Ticket</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Profile Completion Modal */}
            {isCompletingProfile && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-white/90 backdrop-blur-xl">
                    <div className="bg-white border-2 border-black rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                        <h2 className="text-xl font-bold mb-2">Complete Your Profile</h2>
                        <p className="text-sm text-[#71717a] mb-6">We need your unit number to enable security features.</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="resend-label">Unit / Flat Number</label>
                                <input
                                    className="resend-input"
                                    placeholder="e.g. 101, A-202"
                                    value={profileFormData.flat_number}
                                    onChange={e => setProfileFormData({ ...profileFormData, flat_number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="resend-label">Phone Number</label>
                                <input
                                    className="resend-input"
                                    placeholder="+91..."
                                    value={profileFormData.phone_number}
                                    onChange={e => setProfileFormData({ ...profileFormData, phone_number: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCompleteProfile}
                            disabled={!profileFormData.flat_number}
                            className="resend-button-primary w-full h-12 disabled:opacity-50"
                        >
                            Save Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2 w-full text-sm rounded-md transition-colors ${active ? 'bg-[#f4f4f5] text-black font-bold' : 'text-[#71717a] hover:text-black hover:bg-[#fafafa]'
            }`}
    >
        {icon}
        <span className="flex-1 text-left">{label}</span>
    </button>
);

export default ResidentDashboard;
