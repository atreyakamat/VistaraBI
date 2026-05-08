'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate processing
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const success = searchParams.get('success') === '1';
    const already = searchParams.get('already') === '1';
    const error = searchParams.get('error');

    const getContent = () => {
        if (isLoading) {
            return {
                icon: Clock,
                title: 'Verifying your email...',
                message: 'Please wait while we confirm your email address.',
                color: 'text-blue-500',
                bgColor: 'bg-blue-50 dark:bg-blue-900/10',
                buttonText: null,
                buttonHref: null,
            };
        }

        if (success) {
            return {
                icon: CheckCircle,
                title: '✓ Email verified!',
                message: 'Your email has been successfully verified. You can now log in to your account.',
                color: 'text-green-600',
                bgColor: 'bg-green-50 dark:bg-green-900/10',
                buttonText: 'Go to login',
                buttonHref: '/login',
            };
        }

        if (already) {
            return {
                icon: CheckCircle,
                title: 'Already verified',
                message: 'Your email has already been verified. You can proceed to login.',
                color: 'text-green-600',
                bgColor: 'bg-green-50 dark:bg-green-900/10',
                buttonText: 'Go to login',
                buttonHref: '/login',
            };
        }

        if (error === 'missing-token') {
            return {
                icon: AlertCircle,
                title: 'Invalid verification link',
                message: 'The verification link is missing a required token. Please try registering again.',
                color: 'text-red-600',
                bgColor: 'bg-red-50 dark:bg-red-900/10',
                buttonText: 'Register',
                buttonHref: '/register',
            };
        }

        if (error === 'invalid-token') {
            return {
                icon: AlertCircle,
                title: 'Link expired or invalid',
                message: 'This verification link is no longer valid. Please register again to receive a new verification email.',
                color: 'text-red-600',
                bgColor: 'bg-red-50 dark:bg-red-900/10',
                buttonText: 'Register again',
                buttonHref: '/register',
            };
        }

        if (error === 'server') {
            return {
                icon: AlertCircle,
                title: 'Something went wrong',
                message: 'An error occurred while verifying your email. Please try again later or contact support.',
                color: 'text-red-600',
                bgColor: 'bg-red-50 dark:bg-red-900/10',
                buttonText: 'Back to login',
                buttonHref: '/login',
            };
        }

        // Default: success
        return {
            icon: CheckCircle,
            title: '✓ Email verified!',
            message: 'Your email has been successfully verified. You can now log in to your account.',
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/10',
            buttonText: 'Go to login',
            buttonHref: '/login',
        };
    };

    const content = getContent();
    const IconComponent = content.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white/95 dark:bg-slate-800 rounded-2xl shadow-2xl p-8 backdrop-blur-sm border border-white/10">
                    {/* Icon */}
                    <div className={`flex justify-center mb-6 ${content.color}`}>
                        <IconComponent className="w-16 h-16" strokeWidth={1.5} />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-3">
                        {content.title}
                    </h1>

                    {/* Message */}
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-8 text-sm leading-relaxed">
                        {content.message}
                    </p>

                    {/* Button */}
                    {content.buttonText && content.buttonHref && (
                        <Link
                            href={content.buttonHref}
                            className="w-full inline-block text-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            {content.buttonText}
                        </Link>
                    )}

                    {/* Help text */}
                    <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-6">
                        Need help?{' '}
                        <Link href="/contact" className="text-indigo-600 hover:text-indigo-700 font-medium">
                            Contact support
                        </Link>
                    </p>
                </div>

                {/* Branding */}
                <div className="text-center mt-8">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Powered by <span className="font-semibold text-white">VistaraBI</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
