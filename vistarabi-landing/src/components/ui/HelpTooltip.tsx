'use client';

import { useState } from 'react';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Lightweight tooltip with ? icon.
 * Usage: <HelpTooltip content="This KPI measures..." />
 */
export function HelpTooltip({ content, children, side = 'top' }: TooltipProps) {
    const [visible, setVisible] = useState(false);

    const positionClasses: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses: Record<string, string> = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent border-4',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent border-4',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent border-4',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent border-4',
    };

    return (
        <span
            className="relative inline-flex items-center"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children ?? (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-help transition-colors text-[10px] font-bold select-none">
                    ?
                </span>
            )}
            {visible && (
                <span
                    role="tooltip"
                    className={`absolute z-[500] pointer-events-none w-52 bg-slate-900 text-white text-xs rounded-xl px-3 py-2 leading-relaxed shadow-xl ${positionClasses[side]}`}
                >
                    {content}
                    <span className={`absolute border ${arrowClasses[side]}`} />
                </span>
            )}
        </span>
    );
}

// Pre-configured tooltips for common dashboard elements
export const DASHBOARD_TOOLTIPS = {
    kpi: (name: string) => `${name} is calculated from your uploaded data. Hover over the chart for period-by-period values.`,
    trend: 'The % change compared to the previous period of the same length.',
    forecast: 'AI-generated projection based on historical patterns in your data. Confidence bands show the expected range.',
    anomaly: 'Detected using statistical deviation analysis. Values beyond 2 standard deviations from the rolling average are flagged.',
    domainConfidence: 'How confident the AI is that your data belongs to this business domain (0–100%).',
    kpiBlueprint: 'Your approved KPI list. Lock it to prevent further AI modifications and enable production dashboards.',
    goalStrategy: 'AI-generated scenarios showing different paths to reach your target. Each scenario has a probability and required actions.',
    shareLink: 'Anyone with this link can view your dashboard in read-only mode — no account required.',
    ingestion: 'Your file is being parsed, cleaned, and indexed. This usually takes 10–30 seconds depending on file size.',
    qualityScore: 'Data quality score (A–F) based on completeness, consistency, and uniqueness of your dataset.',
};
