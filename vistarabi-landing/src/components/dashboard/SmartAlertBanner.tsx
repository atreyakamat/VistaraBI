'use client';

// Module 5C — Smart Alert Banner
// Alert strip above KPI cards when anomaly thresholds are breached

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

    const bgColor = criticalCount > 0 ? '#FEF2F2' : '#FFFBEB';
    const borderColor = criticalCount > 0 ? '#FECACA' : '#FDE68A';
    const textColor = criticalCount > 0 ? '#DC2626' : '#D97706';
    const icon = criticalCount > 0 ? '🔴' : '🟡';

    return (
        <div
            className="alert-banner insight-fade-in"
            style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '10px',
                padding: '10px 16px',
                marginBottom: '16px',
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm flex-shrink-0">{icon}</span>
                    <div className="min-w-0">
                        <span className="text-xs font-semibold" style={{ color: textColor }}>
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
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors flex-shrink-0"
                    style={{ color: textColor, background: `${textColor}15` }}
                >
                    View All →
                </button>
            </div>
        </div>
    );
}
