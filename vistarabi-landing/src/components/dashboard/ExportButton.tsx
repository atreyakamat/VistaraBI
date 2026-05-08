'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface ExportButtonProps {
    projectId: string;
    kpiName?: string;
    label?: string;
    className?: string;
}

export function ExportButton({ projectId, kpiName, label = 'Export CSV', className = '' }: ExportButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (kpiName) params.set('kpi', kpiName);

            const res = await fetch(`/api/projects/${projectId}/export?${params}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error ?? 'Export failed');
                return;
            }

            // Trigger download
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'export.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('CSV downloaded!');
        } catch {
            toast.error('Export failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            title={`Export ${kpiName ?? 'all data'} as CSV`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${className || 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
        >
            {loading ? (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
                <span className="material-symbols-outlined text-sm">download</span>
            )}
            {loading ? 'Exporting…' : label}
        </button>
    );
}
