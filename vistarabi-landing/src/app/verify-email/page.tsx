'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const verified = searchParams.get('verified') === '1';

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 text-center shadow-2xl"
                >
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl text-emerald-500">
                            {verified ? 'verified_user' : 'mail'}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-4">
                        {verified ? 'Email Verified!' : 'Check your inbox'}
                    </h1>

                    <p className="text-slate-400 mb-8 leading-relaxed">
                        {verified 
                            ? "Your account is now fully activated. You can now log in and start exploring your data." 
                            : "We've sent a verification link to your email address. Please click it to activate your account."}
                    </p>

                    {verified ? (
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Log In to Dashboard
                        </Link>
                    ) : (
                        <div className="space-y-4">
                             <Link
                                href="/login"
                                className="block w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                            >
                                Back to Login
                            </Link>
                            <p className="text-xs text-slate-500">
                                Didn't receive an email? Check your spam folder or contact support.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
