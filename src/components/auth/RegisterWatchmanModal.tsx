import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface RegisterWatchmanModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RegisterWatchmanModal = ({ isOpen, onClose }: RegisterWatchmanModalProps) => {
    const [societies, setSocieties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', societyId: '', shift: 'Day' as 'Day' | 'Night'
    });

    useEffect(() => {
        if (isOpen) fetchSocieties();
    }, [isOpen]);

    const fetchSocieties = async () => {
        const { data } = await supabase.from('societies').select('id, name').eq('status', 'approved');
        if (data) setSocieties(data);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await supabase.from('watchman_requests').insert({
                full_name: formData.name, email: formData.email, phone_number: formData.phone,
                society_id: formData.societyId, shift: formData.shift, status: 'pending'
            });
            toast.success("Request Submitted. Admin will review.");
            onClose();
            setFormData({ name: '', email: '', phone: '', societyId: '', shift: 'Day' });
        } catch (error: any) { toast.error(error.message); } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-lg bg-white border border-[#e4e4e7] rounded-xl shadow-2xl p-8"
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#71717a] hover:text-black">
                        <X size={20} />
                    </button>

                    <div className="mb-8">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white text-[14px] font-bold mb-4">C</div>
                        <h2 className="text-xl font-bold tracking-tight">Security Personnel</h2>
                        <p className="text-sm text-[#71717a] mt-1 italic">Join the CIVORA security grid.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="resend-label">Full Name</label>
                                <input required className="resend-input" placeholder="Guard Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="resend-label">Phone</label>
                                <input required className="resend-input" placeholder="+91..." value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="resend-label">Assigned Society</label>
                            <select required className="resend-input" value={formData.societyId} onChange={e => setFormData({ ...formData, societyId: e.target.value })}>
                                <option value="">Choose Society</option>
                                {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="resend-label">Shift Assignment</label>
                            <select required className="resend-input" value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value as 'Day' | 'Night' })}>
                                <option value="Day">Day Shift (08:00 - 20:00)</option>
                                <option value="Night">Night Shift (20:00 - 08:00)</option>
                            </select>
                        </div>

                        <div>
                            <label className="resend-label">Official Email</label>
                            <input required type="email" className="resend-input" placeholder="guard@domain.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            <p className="text-[10px] text-[#71717a] mt-2 italic">Credentials will be dispatched to this address after verification.</p>
                        </div>

                        <button type="submit" disabled={loading} className="resend-button-primary w-full h-12">
                            {loading ? 'Processing...' : 'Submit Request'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RegisterWatchmanModal;
