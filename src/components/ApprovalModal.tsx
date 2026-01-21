import { motion } from 'framer-motion';
import { Copy, Mail, CheckCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    societyName: string;
    adminName: string;
    adminEmail: string;
    tempPassword: string;
}

const ApprovalModal = ({ isOpen, onClose, societyName, adminName, adminEmail, tempPassword }: ApprovalModalProps) => {
    if (!isOpen) return null;

    const emailSubject = encodeURIComponent(`Approval: ${societyName} Registration`);
    const emailBody = encodeURIComponent(
        `Dear ${adminName},

Congratulations! Your society "${societyName}" has been approved.

Here are your temporary admin credentials:
Portal URL: ${window.location.origin}
Email: ${adminEmail}
Temporary Password: ${tempPassword}

Please login and change your password immediately.

Regards,
Executive Team
SocietyPro`
    );

    const handleSendEmail = () => {
        window.location.href = `mailto:${adminEmail}?subject=${emailSubject}&body=${emailBody}`;
    };

    const handleCopy = () => {
        const text = `
Society: ${societyName}
Admin: ${adminEmail}
Password: ${tempPassword}
        `;
        navigator.clipboard.writeText(text);
        toast.success("Credentials Copied!");
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-emerald-500" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Approval Successful!</h2>
                    <p className="text-slate-400 mb-6">The society has been activated. Please share the credentials with the admin.</p>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 w-full mb-6 text-left">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">One-Time Credentials</div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-400 text-sm">Email:</span>
                                <span className="text-white font-mono text-sm">{adminEmail}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 text-sm">Pass:</span>
                                <span className="text-white font-mono text-sm">{tempPassword}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={handleSendEmail}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Mail size={18} /> Open Email Client
                        </button>
                        <button
                            onClick={handleCopy}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Copy size={18} /> Copy to Clipboard
                        </button>
                    </div>
                </div>

                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={24} />
                </button>
            </motion.div>
        </div>
    );
};

export default ApprovalModal;
