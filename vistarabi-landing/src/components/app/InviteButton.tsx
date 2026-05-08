'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface InviteLinkProps {
    /** Optional — pre-fills referral source for tracking */
    referralSource?: string;
}

/**
 * InviteButton — generates a referral link with the user's email pre-filled.
 * Displays inline in the sidebar or settings page.
 */
export function InviteButton({ referralSource = 'sidebar' }: InviteLinkProps) {
    const [copied, setCopied] = useState(false);

    const generateLink = useCallback(() => {
        const base = typeof window !== 'undefined' ? window.location.origin : 'https://vistarabi.com';
        const link = `${base}/register?ref=${referralSource}&utm_source=referral&utm_medium=invite`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            toast.success('Invite link copied! Share it with a colleague.', { duration: 3000 });
            setTimeout(() => setCopied(false), 3000);
        });
    }, [referralSource]);

    return (
        <button
            onClick={generateLink}
            title="Invite a colleague"
            className="sidebar-nav-item group relative"
            aria-label="Copy invite link"
        >
            <span className={`material-symbols-outlined transition-colors ${copied ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {copied ? 'check_circle' : 'person_add'}
            </span>
            {/* Tooltip */}
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700">
                Invite colleague
            </span>
        </button>
    );
}
