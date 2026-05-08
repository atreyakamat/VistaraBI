'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SharePanelProps {
    projectId: string;
    projectName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function SharePanel({ projectId, projectName, isOpen, onClose }: SharePanelProps) {
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [generated, setGenerated] = useState(false);

    const generateLink = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate' }),
            });
            const data = await res.json();
            if (data.shareUrl) {
                setShareUrl(data.shareUrl);
                setGenerated(true);
            }
        } catch {
            toast.error('Failed to generate share link');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const copyLink = useCallback(() => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            toast.success('Link copied to clipboard!');
        }
    }, [shareUrl]);

    const revokeLink = useCallback(async () => {
        setLoading(true);
        try {
            await fetch(`/api/projects/${projectId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            });
            setShareUrl(null);
            setGenerated(false);
            toast.success('Share link revoked');
        } catch {
            toast.error('Failed to revoke link');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-indigo-600">share</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Share Dashboard</h3>
                            <p className="text-sm text-slate-500">{projectName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Description */}
                <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-indigo-700 leading-relaxed">
                    <strong>Read-only access.</strong> Anyone with this link can view the dashboard, KPIs, and insights — but cannot edit or download your data.
                </div>

                {!generated ? (
                    <button
                        onClick={generateLink}
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined text-lg">link</span>
                        )}
                        {loading ? 'Generating…' : 'Generate Share Link'}
                    </button>
                ) : (
                    <div className="space-y-3">
                        {/* URL box */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 pr-4">
                            <input
                                readOnly
                                value={shareUrl || ''}
                                className="flex-1 bg-transparent text-sm text-slate-700 outline-none font-mono truncate"
                            />
                            <button
                                onClick={copyLink}
                                className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                Copy
                            </button>
                        </div>

                        {/* Embed code */}
                        <div className="bg-slate-900 rounded-2xl p-4">
                            <p className="text-slate-400 text-xs font-mono mb-2">Embed code:</p>
                            <code className="text-emerald-400 text-xs font-mono break-all leading-relaxed">
                                {`<iframe src="${shareUrl}?embed=1" width="100%" height="600" frameborder="0" style="border-radius:16px;"></iframe>`}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`<iframe src="${shareUrl}?embed=1" width="100%" height="600" frameborder="0" style="border-radius:16px;"></iframe>`);
                                    toast.success('Embed code copied!');
                                }}
                                className="mt-3 text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                Copy embed code
                            </button>
                        </div>

                        <button
                            onClick={revokeLink}
                            disabled={loading}
                            className="w-full py-2 text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
                        >
                            Revoke link
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
