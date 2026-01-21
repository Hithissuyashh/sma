import { useState, useEffect } from 'react';
import { UserPlus, Clock, LogOut, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const WatchmanDashboard = () => {
    const navigate = useNavigate();
    const [visitors, setVisitors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', flat: '', purpose: 'Visiting' });
    const [userProfile, setUserProfile] = useState<any>(null);
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [selectedResidentId, setSelectedResidentId] = useState('');

    useEffect(() => {
        fetchWatchmanData();
        const cleanup = setupRealtimeListeners();
        return cleanup;
    }, []);

    const fetchWatchmanData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile);

        if (profile) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Fetch visitor requests
            const { data: visitorData } = await supabase
                .from('visitor_requests')
                .select('*')
                .eq('society_id', profile.society_id)
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false });

            setVisitors(visitorData || []);

            // Fetch active SOS alerts
            const { data: alertData } = await supabase
                .from('security_alerts')
                .select('*')
                .eq('society_id', profile.society_id)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            setActiveAlerts(alertData || []);

            // Fetch residents for auto-population
            const { data: resData } = await supabase
                .from('profiles')
                .select('id, full_name, flat_number')
                .eq('society_id', profile.society_id)
                .eq('role', 'resident')
                .order('flat_number', { ascending: true });

            setResidents(resData || []);
        }
    };

    const setupRealtimeListeners = () => {
        // Visitor requests listener
        const visitorChannel = supabase
            .channel('visitor_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_requests' }, () => {
                fetchWatchmanData();
            })
            .subscribe();

        // SOS Alerts listener
        const alertChannel = supabase
            .channel('sos_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_alerts' }, (payload) => {
                if (payload.new.status === 'active') {
                    toast.error(`SOS ALERT: Unit ${payload.new.flat_number}`, { duration: 10000, icon: '🚨' });
                    fetchWatchmanData();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(visitorChannel);
            supabase.removeChannel(alertChannel);
        };
    };

    const handleRequestApproval = async () => {
        if (!formData.name || !formData.phone || !formData.flat) {
            toast.error('Required fields missing');
            return;
        }

        setLoading(true);
        const loadToast = toast.loading('Locating resident...');

        try {
            let residentId = selectedResidentId;

            if (!residentId) {
                const { data: resident, error: findError } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('flat_number', formData.flat)
                    .eq('society_id', userProfile?.society_id)
                    .eq('role', 'resident')
                    .limit(1)
                    .maybeSingle();

                if (findError || !resident) throw new Error('Unit not found. Please select a resident from the list.');
                residentId = resident.id;
            }

            const { error: insertError } = await supabase.from('visitor_requests').insert({
                visitor_name: formData.name,
                visitor_phone: formData.phone,
                flat_number: formData.flat,
                resident_id: residentId,
                society_id: userProfile?.society_id,
                purpose: formData.purpose,
                status: 'pending'
            });

            if (insertError) {
                console.error("Insertion Error:", insertError);
                throw new Error(`Failed to send request: ${insertError.message}`);
            }

            const residentName = residents.find(r => r.id === residentId)?.full_name || 'Resident';
            toast.success(`AUTHORIZED: Sent to Unit ${formData.flat} (${residentName})`, { id: loadToast });
            setFormData({ name: '', phone: '', flat: '', purpose: 'Visiting' });
            setSelectedResidentId('');
            fetchWatchmanData();
        } catch (error: any) {
            toast.error(error.message, { id: loadToast });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkExit = async (id: string) => {
        try {
            await supabase.from('visitor_requests').update({ exit_time: new Date().toISOString() }).eq('id', id);
            toast.success('Exit recorded');
            fetchWatchmanData();
        } catch (error: any) { toast.error('Failed to record exit'); }
    };

    const resolveAlert = async (id: string) => {
        try {
            await supabase.from('security_alerts').update({ status: 'resolved' }).eq('id', id);
            toast.success('Alert resolved');
            fetchWatchmanData();
        } catch (error) { toast.error('Failed to resolve'); }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#fafafa] text-black font-sans selection:bg-black selection:text-white pb-20">
            <header className="border-b border-[#e4e4e7] bg-white h-16 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 premium-gradient-bg rounded flex items-center justify-center text-white text-[12px] font-bold">C</div>
                    <span className="font-bold text-sm tracking-tight premium-gradient-text">CIVORA <span className="text-[#71717a] font-medium ml-1">Security</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="text-[#71717a] hover:text-black transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-12">
                {/* Active SOS Alerts Section */}
                {activeAlerts.length > 0 && (
                    <div className="mb-12 animate-pulse">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-red-600 mb-6 flex items-center gap-2">
                            <AlertCircle size={16} /> EMERGENCY SOS SIGNALS
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeAlerts.map(alert => (
                                <div key={alert.id} className="bg-red-50 border border-red-200 p-6 rounded-2xl flex justify-between items-center shadow-lg shadow-red-100">
                                    <div>
                                        <div className="text-red-600 font-bold text-lg">Unit {alert.flat_number}</div>
                                        <div className="text-red-500 text-xs font-mono uppercase tracking-tighter">Active Panic Signal</div>
                                    </div>
                                    <button
                                        onClick={() => resolveAlert(alert.id)}
                                        className="bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-all shadow-md active:scale-95"
                                    >
                                        MARK SAFE
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter mb-2">Gate Control</h2>
                    <p className="text-sm text-[#71717a]">Monitor visitor entries and security protocols.</p>
                </div>

                {/* Entry Action */}
                <div className="resend-card p-10 mb-12 glass-card shadow-xl border-[#e4e4e7]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#71717a] mb-8 flex items-center gap-2">
                        <UserPlus size={16} /> Register New Visitor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="md:col-span-2">
                            <label className="resend-label">Select Resident (Auto-fills Unit)</label>
                            <select
                                className="resend-input font-bold"
                                value={selectedResidentId}
                                onChange={(e) => {
                                    const resId = e.target.value;
                                    setSelectedResidentId(resId);
                                    const resident = residents.find(r => r.id === resId);
                                    if (resident) {
                                        setFormData({ ...formData, flat: resident.flat_number });
                                    }
                                }}
                            >
                                <option value="">Choose a Resident...</option>
                                {residents.map(r => (
                                    <option key={r.id} value={r.id}>
                                        Unit {r.flat_number} - {r.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="resend-label">Visitor Name</label>
                            <input
                                placeholder="Full Name"
                                className="resend-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="resend-label">Contact Number</label>
                            <input
                                placeholder="+1 234..."
                                className="resend-input"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="resend-label">Dest. Unit</label>
                            <input
                                readOnly
                                placeholder="Auto-filled"
                                className="resend-input font-bold bg-[#fafafa] cursor-not-allowed"
                                value={formData.flat}
                            />
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="resend-label">Purpose</label>
                        <select
                            className="resend-input"
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        >
                            <option value="Visiting">Visiting</option>
                            <option value="Delivery">Delivery</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Relative">Relative</option>
                        </select>
                    </div>
                    <button
                        onClick={handleRequestApproval}
                        disabled={loading}
                        className="resend-button-primary w-full mt-10 h-14 text-sm font-bold tracking-widest uppercase hover:scale-[1.01] transition-transform"
                    >
                        {loading ? 'Processing Protocol...' : 'Request Unit Authorization'}
                    </button>
                </div>

                {/* Visitor Log */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#71717a] flex items-center gap-2">
                        <Clock size={16} /> Daily Security Log
                    </h3>
                    <div className="resend-card overflow-hidden shadow-sm border-[#e4e4e7]">
                        <table className="w-full text-left font-sans text-sm">
                            <thead>
                                <tr className="bg-[#fafafa]">
                                    <th className="resend-table-header px-6 py-4">Visitor Details</th>
                                    <th className="resend-table-header px-6 py-4">Destination</th>
                                    <th className="resend-table-header px-6 py-4">Status</th>
                                    <th className="resend-table-header px-6 py-4">Timeline</th>
                                    <th className="resend-table-header text-right px-8 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e4e4e7]">
                                {visitors.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-[#71717a] italic">No activity recorded for current shift.</td>
                                    </tr>
                                ) : (
                                    visitors.map((v) => (
                                        <tr key={v.id} className="resend-table-row hover:bg-[#fafafa]/50">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-[#09090b]">{v.visitor_name}</div>
                                                <div className="text-[10px] text-[#71717a] font-mono tracking-tighter">{v.visitor_phone}</div>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-xs uppercase tracking-widest">Unit {v.flat_number}</td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                    v.status === 'declined' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-[10px] font-mono font-bold">
                                                    IN: {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {v.exit_time && (
                                                    <div className="text-[10px] font-mono text-amber-600 font-bold">
                                                        OUT: {new Date(v.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {v.status === 'approved' && !v.exit_time && (
                                                    <button
                                                        onClick={() => handleMarkExit(v.id)}
                                                        className="text-[10px] font-bold text-black border border-[#e4e4e7] hover:border-black hover:bg-white px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                                                    >
                                                        MARK EXIT
                                                    </button>
                                                )}
                                                {v.status === 'declined' && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Restricted</span>}
                                                {v.status === 'pending' && <span className="text-[10px] text-amber-600 font-bold uppercase animate-pulse">Awaiting Unit...</span>}
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
    );
};

export default WatchmanDashboard;
