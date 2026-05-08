"use client";

import { motion } from "framer-motion";
import {
    Sparkles, X, RefreshCw, CheckCircle2, AlertTriangle,
    ArrowDown, ArrowRight, FileText
} from "lucide-react";

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

const CLEANING_STEPS = [
    {
        key: 'nullsFilled' as const,
        emoji: '🔧',
        label: 'Null Values Filled',
        description: 'Missing values filled using statistical strategies: numeric columns use median, categorical columns use mode, dates use forward-fill.',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
    },
    {
        key: 'duplicatesRemoved' as const,
        emoji: '🔄',
        label: 'Duplicate Rows Removed',
        description: 'Exact duplicate rows detected using full-row hash comparison. Only unique rows are retained.',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20',
    },
    {
        key: 'datesNormalized' as const,
        emoji: '📅',
        label: 'Dates Normalized',
        description: 'Various date formats (MM/DD/YYYY, DD-Mon-YY, YYYY.MM.DD, Unix timestamps) converted to ISO 8601 standard (YYYY-MM-DD).',
        color: 'text-cyan-500',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
    },
    {
        key: 'currenciesNormalized' as const,
        emoji: '💰',
        label: 'Currency Values Cleaned',
        description: 'Currency symbols ($, €, £, ¥, ₹) stripped, comma separators removed, values converted to clean numeric floats.',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    {
        key: 'textsStandardized' as const,
        emoji: '✏️',
        label: 'Text Values Standardized',
        description: 'Leading/trailing whitespace trimmed, excessive internal spaces collapsed, text case normalized for categorical consistency.',
        color: 'text-violet-500',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
    },
    {
        key: 'emptyColumnsRemoved' as const,
        emoji: '🗑️',
        label: 'Empty Columns Removed',
        description: 'Columns where 100% of values were null, empty, or undefined have been automatically removed to reduce noise.',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
    },
];

export default function CleaningSummary({ summary, onClose, onReClean }: CleaningSummaryProps) {
    const { stats } = summary;
    const rowsRemoved = stats.originalRowCount - stats.cleanedRowCount;
    const totalChanges = stats.nullsFilled + stats.duplicatesRemoved + stats.datesNormalized +
        stats.currenciesNormalized + stats.textsStandardized;
    const retentionRate = stats.originalRowCount > 0
        ? ((stats.cleanedRowCount / stats.originalRowCount) * 100).toFixed(1)
        : '100.0';
    const changeRate = stats.originalRowCount > 0
        ? ((totalChanges / (stats.originalRowCount * Object.keys(stats).length)) * 100).toFixed(2)
        : '0';
    const activeSteps = CLEANING_STEPS.filter(step => stats[step.key] > 0);
    const skippedSteps = CLEANING_STEPS.filter(step => stats[step.key] === 0);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#0f1420] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-800"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100">Data Purification Report</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <FileText className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400">{summary.fileName}</span>
                                {summary.status === 'CLEANED' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                        CLEAN
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl hover:bg-slate-800 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-7 space-y-6">
                    {/* Row Flow */}
                    <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Row Flow Summary</h3>
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-center flex-1">
                                <p className="text-3xl font-black text-slate-100">{stats.originalRowCount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Original Rows</p>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <ArrowRight className="w-5 h-5 text-slate-600" />
                                {rowsRemoved > 0 && (
                                    <span className="text-[10px] font-bold text-orange-400">-{rowsRemoved}</span>
                                )}
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-3xl font-black text-emerald-400">{stats.cleanedRowCount.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Cleaned Rows</p>
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-3xl font-black text-violet-400">{totalChanges.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Cells Modified</p>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-4">
                            <div className="flex-1 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Retention Rate</p>
                                <p className="text-sm font-bold text-emerald-400">{retentionRate}%</p>
                            </div>
                            <div className="flex-1 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Change Density</p>
                                <p className="text-sm font-bold text-violet-400">{changeRate}%</p>
                            </div>
                            <div className="flex-1 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Steps Applied</p>
                                <p className="text-sm font-bold text-blue-400">{activeSteps.length} / {CLEANING_STEPS.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Active Cleaning Steps */}
                    {activeSteps.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Transformations Applied ({activeSteps.length})
                            </h3>
                            <div className="space-y-2">
                                {activeSteps.map((step) => (
                                    <motion.div
                                        key={step.key}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex items-start gap-3 p-4 rounded-xl ${step.bgColor} border ${step.borderColor}`}
                                    >
                                        <span className="text-xl mt-0.5">{step.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-sm font-bold ${step.color}`}>{step.label}</span>
                                                <span className={`text-sm font-black ${step.color} tabular-nums`}>
                                                    {stats[step.key].toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skipped Steps */}
                    {skippedSteps.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                                No Action Needed ({skippedSteps.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {skippedSteps.map((step) => (
                                    <div
                                        key={step.key}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-600"
                                    >
                                        <span className="text-sm">{step.emoji}</span>
                                        <span className="text-xs font-medium">{step.label}</span>
                                        <CheckCircle2 className="w-3 h-3 ml-auto text-slate-700" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamp */}
                    {summary.cleanedAt && (
                        <div className="text-xs text-slate-600 text-center pt-2">
                            Purification completed on {new Date(summary.cleanedAt).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
                    >
                        Close
                    </button>
                    {onReClean && (
                        <button
                            onClick={onReClean}
                            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Re-Purify Dataset
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
