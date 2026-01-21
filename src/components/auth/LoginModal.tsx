import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: string | null;
    onRegisterRequest?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, role, onRegisterRequest }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen || !role) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (role === 'Executive') {
                if (email === 'suyashvish615@gmail.com' && (password === 'suyash0903' || password === 'suyash@0903')) {
                    toast.success('Welcome, Executive!');
                    window.location.href = '/executive-dashboard';
                    return;
                } else {
                    throw new Error('Invalid Executive Credentials');
                }
            }

            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            const { data: profileData } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();

            if (profileData) {
                const userRole = profileData.role.toLowerCase();
                const selectedRole = role.toLowerCase();

                if (userRole !== selectedRole) {
                    toast.error(`Registered as ${userRole}. Redirecting...`);
                    const dashboardMap: { [key: string]: string } = {
                        'admin': '/admin-dashboard',
                        'resident': '/resident-dashboard',
                        'watchman': '/watchman-dashboard',
                        'executive': '/executive-dashboard'
                    };
                    window.location.href = dashboardMap[userRole] || '/';
                    return;
                }
            }

            toast.success(`Access Granted`);
            const dashboardRoutes: { [key: string]: string } = {
                'Admin': '/admin-dashboard',
                'Resident': '/resident-dashboard',
                'Watchman': '/watchman-dashboard'
            };
            window.location.href = dashboardRoutes[role] || '/';

        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-sm bg-white border border-[#e4e4e7] rounded-xl shadow-2xl p-8"
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-[#71717a] hover:text-black">
                        <X size={20} />
                    </button>

                    <div className="mb-8">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white text-[14px] font-bold mb-4">C</div>
                        <h2 className="text-xl font-bold tracking-tight">{role} Login</h2>
                        <p className="text-sm text-[#71717a] mt-1 italic">CIVORA Identity Management</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="resend-label">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="resend-input"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div>
                            <label className="resend-label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="resend-input pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-[#71717a]"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="resend-button-primary w-full h-10 mt-4"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>

                    {(role === 'Resident' || role === 'Watchman') && onRegisterRequest && (
                        <div className="mt-8 pt-6 border-t border-[#e4e4e7] text-center">
                            <button
                                type="button"
                                onClick={onRegisterRequest}
                                className="text-xs text-[#71717a] hover:text-black font-medium"
                            >
                                Need an account? Register as {role}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default LoginModal;
