'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * SessionGuard — wraps all /app/* pages.
 * Intercepts all fetch calls globally. On 401, shows a toast and redirects to login.
 * This handles expired JWTs gracefully without white-screening.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            // Intercept 401 responses from our own API
            const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
            if (response.status === 401 && url.includes('/api/')) {
                const cloned = response.clone();
                try {
                    const body = await cloned.json();
                    if (body.error === 'Session expired' || body.error === 'Unauthorized') {
                        toast.error('Your session has expired. Redirecting to login…', {
                            duration: 3000,
                        });
                        setTimeout(() => {
                            router.push('/login?expired=1');
                        }, 1500);
                    }
                } catch {
                    // Non-JSON 401 — still redirect
                    toast.error('Session expired. Please log in again.');
                    setTimeout(() => router.push('/login?expired=1'), 1500);
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [router]);

    return <>{children}</>;
}
