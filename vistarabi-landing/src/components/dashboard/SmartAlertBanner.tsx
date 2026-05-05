'use client';

// Module 5C — Smart Alert Banner (Glassmorphism)
// Alert strip with Material Symbols icons and glass styling

import type { SmartAlert } from './types';

interface SmartAlertBannerProps {
    alerts: SmartAlert[];
    onViewAll: () => void;
}

export function SmartAlertBanner({ alerts, onViewAll }: SmartAlertBannerProps) {
    const activeAlerts = alerts.filter(a => a.severity !== 'normal');
    if (activeAlerts.length === 0) return null;

    const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;
    const mostCritical = activeAlerts.sort((a, b) => {
        const order = { critical: 0, warning: 1, normal: 2 };
        return order[a.severity] - order[b.severity];
    })[0];

    const isCritical = criticalCount > 0;

    return (
        <div
            className="glass-card insight-fade-in"
            style={{
                background: isCritical ? 'rgba(254, 242, 242, 0.8)' : 'rgba(255, 251, 235, 0.8)',
                borderColor: isCritical ? '#FECACA' : '#FDE68A',
                padding: '12px 16px',
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined flex-shrink-0"
                        style={{ color: isCritical ? '#DC2626' : '#D97706' }}>
                        {isCritical ? 'error' : 'warning'}
                    </span>
                    <div className="min-w-0">
                        <span className="text-xs font-bold"
                            style={{ color: isCritical ? '#DC2626' : '#D97706' }}>
                            {activeAlerts.length} Alert{activeAlerts.length > 1 ? 's' : ''}
                        </span>
                        {criticalCount > 0 && (
                            <span className="text-[10px] text-red-400 ml-2">
                                {criticalCount} critical
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span className="text-[10px] text-amber-500 ml-2">
                                {warningCount} warning
                            </span>
                        )}
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            {mostCritical.kpiName.replace(/_/g, ' ')}: {mostCritical.reason}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onViewAll}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{
                        color: isCritical ? '#DC2626' : '#D97706',
                        background: isCritical ? 'rgba(220, 38, 38, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                    }}
                >
                    View All  to 
                </button>
            </div>
        </div>
    );
}
