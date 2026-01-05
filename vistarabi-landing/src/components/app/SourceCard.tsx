"use client";

import { SourceStatus, QualityScore, QualityGrade, RiskLevel } from "@/lib/prisma";
import { motion } from "framer-motion";

interface SourceCardProps {
    source: {
        id: string;
        fileName: string;
        fileType: string;
        status: SourceStatus;
        rowCount: number;
        colCount: number;
        qualityScore?: QualityScore;
        qualityGrade?: QualityGrade;  // A-F grade from Phase 2B
        riskLevel?: RiskLevel;        // LOW/MEDIUM/HIGH
        cleaned?: boolean;  // If purification complete
        error?: string;
        uploadedAt: string;
    };
    onClick: () => void;
    onDelete?: (sourceId: string) => void;
}

export default function SourceCard({ source, onClick, onDelete }: SourceCardProps) {
    const statusColors = {
        PENDING: "bg-yellow-100 text-yellow-700",
        PROCESSING: "bg-blue-100 text-blue-700",
        READY: "bg-green-100 text-green-700",
        FAILED: "bg-red-100 text-red-700",
    };

    const qualityColors = {
        GOOD: "text-green-600",
        PARTIAL: "text-yellow-600",
        POOR: "text-red-600",
    };

    const qualityLabels = {
        GOOD: "Good Quality",
        PARTIAL: "Partial Quality",
        POOR: "Poor Quality",
    };

    const gradeColors: Record<string, string> = {
        'A': 'bg-green-100 text-green-700 border-green-300',
        'B': 'bg-lime-100 text-lime-700 border-lime-300',
        'C': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'D': 'bg-orange-100 text-orange-700 border-orange-300',
        'F': 'bg-red-100 text-red-700 border-red-300',
    };

    const riskColors: Record<string, string> = {
        'LOW': 'text-green-600',
        'MEDIUM': 'text-yellow-600',
        'HIGH': 'text-red-600',
    };

    const fileIcons: Record<string, React.ReactNode> = {
        csv: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        xlsx: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
        json: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        ),
        xml: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        ),
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent onClick from firing
        if (confirm(`Delete "${source.fileName}"? All associated data will be permanently removed.`)) {
            onDelete?.(source.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--accent)]/30 hover:shadow-md transition-all relative group"
        >
            {/* Delete Button */}
            {onDelete && (
                <button
                    onClick={handleDelete}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                    title="Delete file"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}

            <div className="flex items-start gap-3 cursor-pointer" onClick={onClick}>
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center flex-shrink-0">
                    {fileIcons[source.fileType] || fileIcons.csv}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-[var(--foreground)] truncate">{source.fileName}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[source.status]}`}>
                            {source.status}
                        </span>
                    </div>
                    {source.status === "READY" ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-[var(--muted)]">
                                {source.rowCount.toLocaleString()} rows · {source.colCount} columns
                            </p>
                            {source.qualityScore && (
                                <span className={`text-xs font-medium ${qualityColors[source.qualityScore]}`}>
                                    • {qualityLabels[source.qualityScore]}
                                </span>
                            )}
                            {source.cleaned && (
                                <span className="text-xs font-medium text-purple-600 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Cleaned
                                </span>
                            )}
                            {source.qualityGrade && (
                                <span className={`px-2 py-0.5 text-xs font-bold rounded border ${gradeColors[source.qualityGrade]}`}>
                                    Grade {source.qualityGrade}
                                </span>
                            )}
                            {source.riskLevel && source.riskLevel !== 'LOW' && (
                                <span className={`text-xs font-medium ${riskColors[source.riskLevel]} flex items-center gap-1`}>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {source.riskLevel} RISK
                                </span>
                            )}
                        </div>
                    ) : source.status === "FAILED" ? (
                        <p className="text-sm text-red-600 truncate">{source.error}</p>
                    ) : (
                        <p className="text-sm text-[var(--muted)]">Processing...</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
