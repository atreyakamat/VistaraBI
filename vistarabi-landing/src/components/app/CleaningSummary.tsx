"use client";

import { motion } from "framer-motion";

interface CleaningSummaryProps {
    summary: {
        sourceId: string;
        fileName: string;
        status: string;
        cleanedAt?: Date | string;
        stats: {
            nullsFilled: number;
            duplicatesRemoved: number;
            datesNormalized: number;
            currenciesNormalized: number;
            textsStandardized: number;
            emptyColumnsRemoved: number;
            originalRowCount: number;
            cleanedRowCount: number;
        };
    };
    onClose: () => void;
    onReClean?: () => void;
}

export default function CleaningSummary({ summary, onClose, onReClean }: CleaningSummaryProps) {
    const { stats } = summary;
    const rowsRemoved = stats.originalRowCount - stats.cleanedRowCount;
    const totalChanges = stats.nullsFilled + stats.duplicatesRemoved + stats.datesNormalized +
        stats.currenciesNormalized + stats.textsStandardized;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Data Purification Summary
                        </h2>
                        <p className="text-sm text-[var(--muted)] mt-1">{summary.fileName}</p>
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
                    {/* Overview */}
                    <div className="bg-[var(--background)] rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Overview</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-[var(--muted)]">Original Rows</p>
                                <p className="text-2xl font-bold text-[var(--foreground)]">{stats.originalRowCount.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--muted)]">Cleaned Rows</p>
                                <p className="text-2xl font-bold text-green-600">{stats.cleanedRowCount.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--muted)]">Rows Removed</p>
                                <p className="text-2xl font-bold text-orange-600">{rowsRemoved.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--muted)]">Total Changes</p>
                                <p className="text-2xl font-bold text-purple-600">{totalChanges.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Purification Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Purification Details</h3>
                        <div className="space-y-3">
                            <PurificationStat
                                icon="📝"
                                label="Null Values Filled"
                                value={stats.nullsFilled}
                                description="Missing values filled using statistical strategies"
                            />
                            <PurificationStat
                                icon="🔁"
                                label="Duplicates Removed"
                                value={stats.duplicatesRemoved}
                                description="Exact duplicate rows detected and removed"
                            />
                            <PurificationStat
                                icon="📅"
                                label="Dates Normalized"
                                value={stats.datesNormalized}
                                description="Various date formats converted to ISO (YYYY-MM-DD)"
                            />
                            <PurificationStat
                                icon="💰"
                                label="Currencies Normalized"
                                value={stats.currenciesNormalized}
                                description="Currency symbols removed and values normalized to USD"
                            />
                            <PurificationStat
                                icon="✏️"
                                label="Text Standardized"
                                value={stats.textsStandardized}
                                description="Whitespace trimmed, case normalized"
                            />
                            <PurificationStat
                                icon="🗑️"
                                label="Empty Columns Removed"
                                value={stats.emptyColumnsRemoved}
                                description="Columns with no data automatically removed"
                            />
                        </div>
                    </div>

                    {/* Timestamp */}
                    {summary.cleanedAt && (
                        <div className="text-xs text-[var(--muted)] text-center">
                            Cleaned on {new Date(summary.cleanedAt).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-[var(--border)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--background)] transition-colors"
                    >
                        Close
                    </button>
                    {onReClean && (
                        <button
                            onClick={onReClean}
                            className="flex-1 px-4 py-2 bg-[var(--primary)] text-white font-semibold rounded-xl hover:bg-[var(--accent)] transition-colors"
                        >
                            Re-clean Dataset
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// Helper component for purification stats
function PurificationStat({ icon, label, value, description }: {
    icon: string;
    label: string;
    value: number;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
                    <span className="text-sm font-bold text-purple-600">{value.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">{description}</p>
            </div>
        </div>
    );
}
