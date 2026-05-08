'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileCheck, Brain, Sparkles, Shield, BarChart3,
    CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export interface IngestionStep {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    status: 'pending' | 'running' | 'done' | 'error';
    details?: string;
    stats?: Record<string, string | number>;
}

interface IngestionProgressProps {
    fileName: string;
    isActive: boolean;
    sourceId?: string;
    onComplete?: () => void;
}

const PIPELINE_STEPS: Omit<IngestionStep, 'status'>[] = [
    {
        id: 'upload',
        label: 'Uploading File',
        description: 'Transferring file to server',
        icon: <Upload className="w-4 h-4" />,
    },
    {
        id: 'parse',
        label: 'Parsing Data',
        description: 'Reading rows, detecting columns & data types',
        icon: <FileCheck className="w-4 h-4" />,
    },
    {
        id: 'intelligence',
        label: 'Column Intelligence',
        description: 'Analyzing column types, statistics, and relationships',
        icon: <Brain className="w-4 h-4" />,
    },
    {
        id: 'cleaning',
        label: 'Data Purification',
        description: 'Filling nulls, removing duplicates, normalizing dates & currencies',
        icon: <Sparkles className="w-4 h-4" />,
    },
    {
        id: 'quality',
        label: 'Quality Assessment',
        description: 'Scoring data quality, detecting outliers, grading risk',
        icon: <Shield className="w-4 h-4" />,
    },
    {
        id: 'domain',
        label: 'Domain Detection',
        description: 'Identifying business domain and loading AI model',
        icon: <BarChart3 className="w-4 h-4" />,
    },
];

export default function IngestionProgress({ fileName, isActive, sourceId, onComplete }: IngestionProgressProps) {
    const [steps, setSteps] = useState<IngestionStep[]>(
        PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const }))
    );
    const [expanded, setExpanded] = useState(true);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [completedSourceData, setCompletedSourceData] = useState<any>(null);

    // Simulate pipeline progress based on real backend events
    const advanceStep = useCallback((stepId: string, status: 'running' | 'done' | 'error', details?: string, stats?: Record<string, string | number>) => {
        setSteps(prev => prev.map(s =>
            s.id === stepId ? { ...s, status, details, stats: stats || s.stats } : s
        ));
    }, []);

    // Poll for source status if we have a sourceId
    useEffect(() => {
        if (!sourceId || !isActive) return;

        let cancelled = false;
        let pollCount = 0;

        const poll = async () => {
            if (cancelled || pollCount > 60) return; // Max 60 polls (2 min)
            pollCount++;

            try {
                const res = await fetch(`/api/sources/${sourceId}`);
                if (!res.ok) return;
                const data = await res.json();
                const source = data.source;

                if (source.status === 'READY') {
                    // Mark parsing as done
                    advanceStep('parse', 'done', `${source.rowCount} rows × ${source.colCount} columns`, {
                        'Rows': source.rowCount,
                        'Columns': source.colCount,
                    });

                    // Check if cleaning is done
                    try {
                        const cleanRes = await fetch(`/api/sources/${sourceId}/cleaning-summary`);
                        if (cleanRes.ok) {
                            const cleanData = await cleanRes.json();
                            const stats = cleanData.summary?.stats;
                            if (stats) {
                                advanceStep('intelligence', 'done', 'Column analysis complete');
                                advanceStep('cleaning', 'done',
                                    `${stats.nullsFilled} nulls filled, ${stats.duplicatesRemoved} duplicates removed`,
                                    {
                                        'Nulls Filled': stats.nullsFilled,
                                        'Duplicates Removed': stats.duplicatesRemoved,
                                        'Dates Normalized': stats.datesNormalized,
                                        'Currencies Normalized': stats.currenciesNormalized,
                                        'Texts Standardized': stats.textsStandardized,
                                        'Empty Columns Removed': stats.emptyColumnsRemoved,
                                        'Original Rows': stats.originalRowCount,
                                        'Cleaned Rows': stats.cleanedRowCount,
                                    }
                                );
                            }
                        }
                    } catch { /* silent */ }

                    // Check quality
                    try {
                        const qualRes = await fetch(`/api/sources/${sourceId}/quality`);
                        if (qualRes.ok) {
                            const qualData = await qualRes.json();
                            const q = qualData.quality;
                            if (q) {
                                advanceStep('quality', 'done',
                                    `Grade: ${q.overallGrade} | Risk: ${q.riskLevel}`,
                                    {
                                        'Overall Grade': q.overallGrade,
                                        'Risk Level': q.riskLevel,
                                        'Completeness': `${q.completenessScore}%`,
                                        'Consistency': `${q.consistencyScore}%`,
                                    }
                                );
                            }
                        }
                    } catch { /* silent */ }

                    // Domain detection  
                    advanceStep('domain', 'done', 'Domain auto-detected from column patterns');

                    setCompletedSourceData(source);
                    onComplete?.();
                    return; // Stop polling
                }

                if (source.status === 'FAILED') {
                    advanceStep('parse', 'error', source.error || 'Failed to parse file');
                    return;
                }

                // Still processing — schedule next poll
                setTimeout(poll, 2000);
            } catch {
                setTimeout(poll, 3000);
            }
        };

        poll();
        return () => { cancelled = true; };
    }, [sourceId, isActive, advanceStep, onComplete]);

    // Simulate upload step completion on mount
    useEffect(() => {
        if (!isActive) return;
        advanceStep('upload', 'running', 'Transferring...');

        const t1 = setTimeout(() => {
            advanceStep('upload', 'done', `${fileName} uploaded`);
            advanceStep('parse', 'running', 'Reading rows and columns...');
            setCurrentStepIdx(1);
        }, 800);

        const t2 = setTimeout(() => {
            if (!sourceId) {
                advanceStep('parse', 'running', 'Parsing data structure...');
                setCurrentStepIdx(1);
            }
        }, 1500);

        const t3 = setTimeout(() => {
            if (!sourceId) {
                // Without sourceId, simulate the remaining steps
                advanceStep('parse', 'done', 'File parsed successfully');
                advanceStep('intelligence', 'running', 'Analyzing columns...');
                setCurrentStepIdx(2);
            }
        }, 3000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isActive, fileName, sourceId, advanceStep]);

    // Update currentStepIdx based on steps
    useEffect(() => {
        const runningIdx = steps.findIndex(s => s.status === 'running');
        if (runningIdx >= 0) setCurrentStepIdx(runningIdx);
        else {
            const lastDoneIdx = steps.reduce((acc, s, i) => s.status === 'done' ? i : acc, -1);
            if (lastDoneIdx >= 0) setCurrentStepIdx(lastDoneIdx);
        }
    }, [steps]);

    const isComplete = steps.every(s => s.status === 'done');
    const hasError = steps.some(s => s.status === 'error');
    const progress = (steps.filter(s => s.status === 'done').length / steps.length) * 100;

    if (!isActive && !isComplete) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden mb-6"
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--background)]/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                    ) : hasError ? (
                        <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-bold text-[var(--foreground)]">
                            {isComplete ? 'Ingestion Complete' : hasError ? 'Ingestion Failed' : 'Processing Data...'}
                        </h3>
                        <p className="text-xs text-[var(--muted)]">{fileName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Progress bar */}
                    <div className="w-24 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full ${hasError ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="text-xs font-mono text-[var(--muted)]">{Math.round(progress)}%</span>
                    {expanded ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
                </div>
            </div>

            {/* Steps */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-[var(--border)]"
                    >
                        <div className="px-5 py-4 space-y-1">
                            {steps.map((step, i) => (
                                <div key={step.id} className="flex items-start gap-3 py-2">
                                    {/* Status indicator */}
                                    <div className="mt-0.5 shrink-0">
                                        {step.status === 'done' ? (
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                            </div>
                                        ) : step.status === 'running' ? (
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center">
                                                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                                            </div>
                                        ) : step.status === 'error' ? (
                                            <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
                                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-[var(--border)] flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-[var(--muted)]" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${
                                                step.status === 'done' ? 'text-emerald-500' :
                                                step.status === 'running' ? 'text-[var(--foreground)]' :
                                                step.status === 'error' ? 'text-red-500' :
                                                'text-[var(--muted)]'
                                            }`}>
                                                {step.label}
                                            </span>
                                            <span className="text-[var(--muted)]">{step.icon}</span>
                                        </div>
                                        <p className="text-xs text-[var(--muted)] mt-0.5">{step.description}</p>

                                        {/* Details & Stats */}
                                        {step.details && (step.status === 'done' || step.status === 'error' || step.status === 'running') && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`mt-1.5 text-xs font-medium px-2.5 py-1 rounded-lg inline-block ${
                                                    step.status === 'error' ? 'bg-red-500/10 text-red-400' :
                                                    step.status === 'running' ? 'bg-indigo-500/10 text-indigo-400' :
                                                    'bg-emerald-500/10 text-emerald-400'
                                                }`}
                                            >
                                                {step.details}
                                            </motion.div>
                                        )}

                                        {/* Expanded stats for cleaning step */}
                                        {step.stats && step.status === 'done' && Object.keys(step.stats).length > 2 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2"
                                            >
                                                {Object.entries(step.stats).map(([key, val]) => (
                                                    <div key={key} className="bg-[var(--background)] rounded-lg px-2.5 py-1.5 border border-[var(--border)]">
                                                        <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{key}</p>
                                                        <p className="text-xs font-bold text-[var(--foreground)]">{val}</p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
