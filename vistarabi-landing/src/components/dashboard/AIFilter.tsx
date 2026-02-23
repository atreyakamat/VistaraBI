'use client';

import { useState } from 'react';
import type { DashboardFilters } from './FilterBar';

interface AIFilterProps {
    onFilterGenerated: (filters: DashboardFilters) => void;
}

export function AIFilter({ onFilterGenerated }: AIFilterProps) {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to generate filter');
            }

            const data = await res.json();

            // Map the parsed AI intent back to strictly typed DashboardFilters
            const newFilters: DashboardFilters = {
                granularity: data.granularity || 'monthly',
                dateRange: data.dateRange || '30d'
            };

            onFilterGenerated(newFilters);
            setQuery(''); // Clear after success
        } catch (err: any) {
            setError(err.message || 'AI filter error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400">
            <span className="material-symbols-outlined text-indigo-500 text-lg">auto_awesome</span>
            <input
                type="text"
                placeholder="Ask AI to filter... (e.g. 'Show last 7 days daily')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
                className="bg-transparent border-none outline-none text-sm w-64 text-slate-700 placeholder-slate-400"
            />
            {isLoading && (
                <svg className="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {error && (
                <span className="text-red-500 text-[10px] w-auto max-w-xs truncate" title={error}>{error}</span>
            )}
        </form>
    );
}
