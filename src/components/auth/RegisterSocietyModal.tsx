import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface RegisterSocietyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RegisterSocietyModal: React.FC<RegisterSocietyModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', address: '', contact_number: '', admin_name: '', admin_email: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('societies').insert([
                {
                    name: formData.name,
                    address: formData.address,
                    contact_number: formData.contact_number,
                    admin_name: formData.admin_name,
                    admin_email: formData.admin_email,
                    status: 'pending'
                }
            ]);

            if (error) throw error;

            toast.success('Application Submitted. Our team will contact you.');
            onClose();
            setFormData({ name: '', address: '', contact_number: '', admin_name: '', admin_email: '' });
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-xl bg-white border border-[#e4e4e7] rounded-xl shadow-2xl p-8"
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#71717a] hover:text-black">
                        <X size={20} />
                    </button>

                    <div className="mb-8">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white text-[14px] font-bold mb-4">C</div>
                        <h2 className="text-xl font-bold tracking-tight">Society Partnership</h2>
                        <p className="text-sm text-[#71717a] mt-1 italic">Join the CIVORA ecosystem for professional management.</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="resend-label">Society Name</label>
                                <input name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} type="text" className="resend-input" placeholder="Majestic Heights" required />
                            </div>
                            <div>
                                <label className="resend-label">Contact</label>
                                <input name="contact_number" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} type="tel" className="resend-input" placeholder="+1..." required />
                            </div>
                        </div>

                        <div>
                            <label className="resend-label">Location / Address</label>
                            <textarea name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="resend-input h-24 resize-none pt-2" placeholder="Full society address..." required />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="resend-label">Lead Administrator</label>
                                <input name="admin_name" value={formData.admin_name} onChange={e => setFormData({ ...formData, admin_name: e.target.value })} type="text" className="resend-input" placeholder="Name" required />
                            </div>
                            <div>
                                <label className="resend-label">Admin Email</label>
                                <input name="admin_email" value={formData.admin_email} onChange={e => setFormData({ ...formData, admin_email: e.target.value })} type="email" className="resend-input" placeholder="admin@domain.com" required />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="resend-button-primary w-full h-12">
                            {loading ? 'Processing...' : 'Submit Application'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default RegisterSocietyModal;
