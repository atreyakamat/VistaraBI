"use client";

import { motion } from "framer-motion";
import { QualityGrade, RiskLevel, HealthStatus } from "@/lib/prisma";

interface QualityDashboardProps {
    quality: {
        overallGrade: QualityGrade;
        completenessScore: number;
        consistencyScore: number;
        accuracyScore: number;
        riskLevel: RiskLevel;
        totalRecords: number;
        healthyRecords: number;
        riskyRecords: number;
    };
    columnHealths?: Array<{
        columnName: string;
        healthStatus: HealthStatus;
        completeness: number;
        consistency: number;
        outlierCount: number;
        uniqueness: number;
        issues: string[];
    }>;
    outliers?: Array<{
        columnName: string;
        rowIndex: number;
        value: unknown;
        severity: 'MILD' | 'MODERATE' | 'EXTREME';
        detectionMethod: 'IQR' | 'Z_SCORE';
        expectedRange?: string;
    }>;
    auditLog?: Array<{
        transformationType: string;
        affectedColumn?: string;
        affectedRowCount: number;
        beforeValue?: string;
        afterValue?: string;
        timestamp: Date | string;
    }>;
    onClose: () => void;
}

export default function QualityDashboard({ quality, columnHealths, outliers, auditLog, onClose }: QualityDashboardProps) {
    const gradeColors: Record<QualityGrade, string> = {
        'A': 'bg-green-100 text-green-700 border-green-300',
        'B': 'bg-lime-100 text-lime-700 border-lime-300',
        'C': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'D': 'bg-orange-100 text-orange-700 border-orange-300',
        'F': 'bg-red-100 text-red-700 border-red-300',
    };

    const riskColors: Record<RiskLevel, string> = {
        'LOW': 'text-green-600 bg-green-100',
        'MEDIUM': 'text-yellow-600 bg-yellow-100',
        'HIGH': 'text-red-600 bg-red-100',
    };

    const healthColors: Record<HealthStatus, string> = {
        'GOOD': 'bg-green-100 text-green-700',
        'PARTIAL': 'bg-yellow-100 text-yellow-700',
        'POOR': 'bg-red-100 text-red-700',
    };

    const severityColors = {
        'MILD': 'text-yellow-600',
        'MODERATE': 'text-orange-600',
        'EXTREME': 'text-red-600',
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-3">
                            <span className={`px-3 py-1 text-2xl font-bold rounded-lg border-2 ${gradeColors[quality.overallGrade]}`}>
                                {quality.overallGrade}
                            </span>
                            Data Quality Intelligence
                        </h2>
                        <p className="text-sm text-[var(--muted)] mt-1">
                            Automated quality assessment & trust metrics
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg hover:bg-[var(--background)] flex items-center justify-center transition-colors"
                    >
                        <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-[var(--background)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted)] mb-1">Completeness</p>
                            <p className="text-2xl font-bold text-[var(--foreground)]">{quality.completenessScore.toFixed(1)}%</p>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${quality.completenessScore}%` }} />
                            </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted)] mb-1">Consistency</p>
                            <p className="text-2xl font-bold text-[var(--foreground)]">{quality.consistencyScore.toFixed(1)}%</p>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: `${quality.consistencyScore}%` }} />
                            </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted)] mb-1">Accuracy</p>
                            <p className="text-2xl font-bold text-[var(--foreground)]">{quality.accuracyScore.toFixed(1)}%</p>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: `${quality.accuracyScore}%` }} />
                            </div>
                        </div>
                        <div className="bg-[var(--background)] rounded-xl p-4">
                            <p className="text-xs text-[var(--muted)] mb-1">Risk Level</p>
                            <p className={`text-xl font-bold px-3 py-1 rounded-lg inline-block ${riskColors[quality.riskLevel]}`}>
                                {quality.riskLevel}
                            </p>
                        </div>
                    </div>

                    {/* Records Summary */}
                    <div className="bg-[var(--background)] rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Records Summary</h3>
                        <div className="flex items-center gap-6">
                            <div>
                                <p className="text-xs text-[var(--muted)]">Total Records</p>
                                <p className="text-xl font-bold text-[var(--foreground)]">{quality.totalRecords.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-green-600">Healthy Records</p>
                                <p className="text-xl font-bold text-green-600">{quality.healthyRecords.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-orange-600">Risky Records</p>
                                <p className="text-xl font-bold text-orange-600">{quality.riskyRecords.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Column Health */}
                    {columnHealths && columnHealths.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Column Health</h3>
                            <div className="bg-[var(--background)] rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-[var(--card)] border-b border-[var(--border)]">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Column</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Health</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Complete</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Consistent</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Outliers</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Issues</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {columnHealths.map((col, idx) => (
                                            <tr key={idx} className="border-b border-[var(--border)]">
                                                <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{col.columnName}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${healthColors[col.healthStatus]}`}>
                                                        {col.healthStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-[var(--muted)]">{col.completeness.toFixed(1)}%</td>
                                                <td className="px-4 py-3 text-sm text-[var(--muted)]">{col.consistency.toFixed(1)}%</td>
                                                <td className="px-4 py-3 text-sm text-[var(--muted)]">{col.outlierCount}</td>
                                                <td className="px-4 py-3 text-xs text-[var(--muted)]">
                                                    {col.issues.length > 0 ? col.issues.join(', ') : 'None'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Outliers */}
                    {outliers && outliers.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                                Detected Outliers ({outliers.length})
                            </h3>
                            <div className="bg-[var(--background)] rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Column</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Row #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Value</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Severity</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Method</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)]">Expected Range</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outliers.slice(0, 50).map((outlier, idx) => (
                                            <tr key={idx} className="border-b border-[var(--border)]">
                                                <td className="px-4 py-2 text-sm font-medium text-[var(--foreground)]">{outlier.columnName}</td>
                                                <td className="px-4 py-2 text-sm text-[var(--muted)]">{outlier.rowIndex + 1}</td>
                                                <td className="px-4 py-2 text-sm font-mono text-[var(--foreground)]">{String(outlier.value)}</td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs font-medium ${severityColors[outlier.severity]}`}>
                                                        {outlier.severity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-xs text-[var(--muted)]">{outlier.detectionMethod}</td>
                                                <td className="px-4 py-2 text-xs text-[var(--muted)]">{outlier.expectedRange || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Audit Log */}
                    {auditLog && auditLog.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                                Transformation Audit Log ({auditLog.length})
                            </h3>
                            <div className="space-y-2">
                                {auditLog.map((log, idx) => (
                                    <div key={idx} className="bg-[var(--background)] rounded-lg p-3 border-l-4 border-blue-500">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-[var(--foreground)]">{log.transformationType.replace(/_/g, ' ')}</p>
                                                {log.affectedColumn && (
                                                    <p className="text-xs text-[var(--muted)]">Column: {log.affectedColumn}</p>
                                                )}
                                                {log.beforeValue && log.afterValue && (
                                                    <p className="text-xs text-[var(--muted)]">
                                                        {log.beforeValue}  to  {log.afterValue}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-[var(--muted)]">{log.affectedRowCount} affected</p>
                                                <p className="text-xs text-[var(--muted)]">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border)] flex justify-between items-center">
                    <p className="text-xs text-[var(--muted)]">
                        Quality intelligence auto-calculated after data purification
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--accent)] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
