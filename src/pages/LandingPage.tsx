import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Shield, User, Users, ArrowRight, X, Globe } from 'lucide-react';
import RegisterSocietyModal from '../components/auth/RegisterSocietyModal';
import RegisterResidentModal from '../components/auth/RegisterResidentModal';
import RegisterWatchmanModal from '../components/auth/RegisterWatchmanModal';
import LoginModal from '../components/auth/LoginModal';

const LandingPage = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isResidentRegisterOpen, setIsResidentRegisterOpen] = useState(false);
    const [isWatchmanRegisterOpen, setIsWatchmanRegisterOpen] = useState(false);
    const [loginRole, setLoginRole] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-white text-[#09090b] selection:bg-black selection:text-white font-sans antialiased">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#e4e4e7]">
                <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Building2 className="text-white" size={18} />
                        </div>
                        <span className="text-xl font-bold tracking-tight">CIVORA</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-[#71717a] hover:text-black transition-colors">Features</a>
                        <a href="#login-section" className="text-sm font-medium text-[#71717a] hover:text-black transition-colors">Portals</a>
                        <button
                            onClick={() => setIsRegisterOpen(true)}
                            className="resend-button-primary h-9 px-4"
                        >
                            Register Society
                        </button>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="pt-32 pb-24">
                <section className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
                            The standard for <br />
                            <span className="text-[#a1a1aa]">modern society living.</span>
                        </h1>
                        <p className="text-xl text-[#71717a] mb-12 max-w-2xl mx-auto">
                            CIVORA provides the infrastructure for seamless society management, secure living, and community engagement.
                        </p>
                        <div className="flex items-center justify-center gap-4 mb-16">
                            <button
                                onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="resend-button-primary h-11 px-8 text-base"
                            >
                                Get Started
                            </button>
                            <button
                                onClick={() => setIsRegisterOpen(true)}
                                className="resend-button-secondary h-11 px-8 text-base"
                            >
                                Contact Sales
                            </button>
                        </div>

                        {/* Layout Image Placeholder / Hero Visual */}
                        <div className="relative w-full aspect-video md:aspect-[2.4/1] bg-[#fafafa] border border-[#e4e4e7] rounded-3xl overflow-hidden mb-24 shadow-sm">
                            <img
                                src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
                                alt="CIVORA Dashboard Preview"
                                className="w-full h-full object-cover mix-blend-multiply opacity-80"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-white/90 backdrop-blur-sm border border-[#e4e4e7] px-6 py-3 rounded-full text-sm font-semibold shadow-xl">
                                    Trusted by 500+ premium societies
                                </span>
                            </div>
                        </div>

                        {/* Two Columns Section (from UI Image) */}
                        <div className="grid md:grid-cols-2 gap-12 text-left py-12 border-t border-[#e4e4e7]">
                            <div>
                                <h3 className="text-lg font-bold mb-4">Engineered for security</h3>
                                <p className="text-[#71717a] leading-relaxed">
                                    Our security infrastructure is built to handle thousands of visitor entries daily with zero latency. Every entry is logged, verified, and notified in real-time.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-4">Designed for clarity</h3>
                                <p className="text-[#71717a] leading-relaxed">
                                    Management should be invisible. CIVORA automates maintenance, notices, and complaints so you can focus on building a better community.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* Role Portals */}
                <section id="login-section" className="bg-[#fafafa] border-t border-b border-[#e4e4e7] py-24 px-6 mt-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16">
                            <h2 className="text-3xl font-bold tracking-tight mb-4">Choose your portal</h2>
                            <p className="text-[#71717a]">Access your specialized dashboard with ease.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <RoleItem
                                icon={<Building2 size={20} />}
                                title="Executive"
                                description="Platform-wide administration and society approvals."
                                onClick={() => setLoginRole('Executive')}
                            />
                            <RoleItem
                                icon={<User size={20} />}
                                title="Admin"
                                description="Oversee your specific society operations and staff."
                                onClick={() => setLoginRole('Admin')}
                            />
                            <RoleItem
                                icon={<Users size={20} />}
                                title="Resident"
                                description="Manage your flat, pay bills, and engage with neighbors."
                                onClick={() => setLoginRole('Resident')}
                                onRegister={() => setIsResidentRegisterOpen(true)}
                            />
                            <RoleItem
                                icon={<Shield size={20} />}
                                title="Watchman"
                                description="Real-time security logs and visitor management."
                                onClick={() => setLoginRole('Watchman')}
                                onRegister={() => setIsWatchmanRegisterOpen(true)}
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-[#e4e4e7] py-12 px-6 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <Building2 size={20} className="text-black" />
                        <span className="font-bold">CIVORA</span>
                    </div>
                    <div className="flex gap-8 text-sm text-[#71717a]">
                        <a href="#" className="hover:text-black transition-colors">Documentation</a>
                        <a href="#" className="hover:text-black transition-colors">Privacy</a>
                        <a href="#" className="hover:text-black transition-colors">Terms</a>
                        <a href="#" className="hover:text-black transition-colors">Twitter</a>
                    </div>
                    <div className="text-sm text-[#a1a1aa]">
                        &copy; {new Date().getFullYear()} CIVORA. All rights reserved.
                    </div>
                </div>
            </footer>

            <RegisterSocietyModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
            <RegisterResidentModal isOpen={isResidentRegisterOpen} onClose={() => setIsResidentRegisterOpen(false)} />
            <RegisterWatchmanModal isOpen={isWatchmanRegisterOpen} onClose={() => setIsWatchmanRegisterOpen(false)} />
            <LoginModal
                isOpen={!!loginRole}
                onClose={() => setLoginRole(null)}
                role={loginRole}
                onRegisterRequest={() => {
                    const currentRole = loginRole;
                    setLoginRole(null);
                    if (currentRole === 'Resident') setIsResidentRegisterOpen(true);
                    if (currentRole === 'Watchman') setIsWatchmanRegisterOpen(true);
                }}
            />
        </div>
    );
};

const RoleItem = ({ icon, title, description, onClick, onRegister }: {
    icon: React.ReactNode,
    title: string,
    description: string,
    onClick: () => void,
    onRegister?: () => void
}) => {
    return (
        <div className="resend-card p-6 flex flex-col hover:border-[#a1a1aa] transition-colors group cursor-pointer" onClick={onClick}>
            <div className="w-10 h-10 bg-[#fafafa] border border-[#e4e4e7] rounded-lg flex items-center justify-center mb-4 group-hover:bg-white transition-colors">
                {icon}
            </div>
            <h3 className="text-base font-bold mb-2">{title}</h3>
            <p className="text-sm text-[#71717a] leading-relaxed mb-6 flex-1">
                {description}
            </p>
            <div className="flex items-center gap-3">
                <button className="text-sm font-semibold flex items-center gap-1 hover:underline">
                    Login <ArrowRight size={14} />
                </button>
                {onRegister && (
                    <>
                        <span className="text-[#e4e4e7]">|</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRegister(); }}
                            className="text-sm text-[#71717a] hover:text-black transition-colors"
                        >
                            Request Access
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default LandingPage;
