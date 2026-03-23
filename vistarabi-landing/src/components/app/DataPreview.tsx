"use client";

import { motion } from "framer-motion";
import { DataType } from "@/lib/prisma";

interface ColumnInfo {
    originalName: string;
    normalizedName: string;
    dataType: DataType;
    nullPercent: number;
    uniquePercent: number;
    sampleValues: unknown[];
}

interface DataPreviewProps {
    source: {
        fileName: string;
        status: string;
        rowCount: number;
        colCount: number;
        columns: string[];
        previewData: Record<string, unknown>[];
        qualityScore?: string;
    };
    columnMeta?: ColumnInfo[];
    onClose: () => void;
    onViewCleaningSummary?: () => void;
    onViewQualityDashboard?: () => void;
}

const typeColors: Record<DataType, string> = {
    TEXT: "bg-gray-100 text-gray-700",
    NUMBER: "bg-blue-100 text-blue-700",
    DATE: "bg-purple-100 text-purple-700",
    BOOLEAN: "bg-green-100 text-green-700",
};

const typeIcons: Record<DataType, string> = {
    TEXT: "Aa",
    NUMBER: "#",
    DATE: "📅",
    BOOLEAN: "✓",
};

export default function DataPreview({ source, columnMeta, onClose, onViewCleaningSummary, onViewQualityDashboard }: DataPreviewProps) {
    // Create a map for quick column lookup
    const columnMap = new Map<string, ColumnInfo>();
    if (columnMeta) {
        columnMeta.forEach(c => columnMap.set(c.originalName, c));
    }

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
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">{source.fileName}</h2>
                        <p className="text-sm text-[var(--muted)]">
                            {source.rowCount.toLocaleString()} rows · {source.colCount} columns
                            {source.previewData.length < source.rowCount && (
                                <span className="ml-2 text-[var(--accent)]">
                                    (showing first {source.previewData.length})
                                </span>
                            )}
                            {source.qualityScore && (
                                <span className="ml-2">
                                    • {source.qualityScore} Quality
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {onViewCleaningSummary && (
                            <button
                                onClick={onViewCleaningSummary}
                                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                View Cleaning Summary
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-lg hover:bg-[var(--background)] flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="min-w-full inline-block">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-[var(--background)]">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] sticky top-0 bg-[var(--background)]">
                                        #
                                    </th>
                                    {source.columns.map((col, i) => {
                                        const meta = columnMap.get(col);
                                        return (
                                            <th
                                                key={i}
                                                className="px-4 py-3 text-left border-b border-[var(--border)] sticky top-0 bg-[var(--background)]"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">
                                                        {col}
                                                    </span>
                                                    {meta && (
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeColors[meta.dataType]}`}>
                                                            {typeIcons[meta.dataType]}
                                                        </span>
                                                    )}
                                                </div>
                                                {meta && (
                                                    <div className="flex gap-2 mt-1 text-[10px] text-[var(--muted)]">
                                                        <span>{meta.nullPercent}% null</span>
                                                        <span>{meta.uniquePercent}% unique</span>
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {source.previewData.map((row, rowIndex) => (
                                    <tr
                                        key={rowIndex}
                                        className="hover:bg-[var(--background)]/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-[var(--muted)] border-b border-[var(--border)]">
                                            {rowIndex + 1}
                                        </td>
                                        {source.columns.map((col, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className="px-4 py-3 text-sm text-[var(--foreground)] border-b border-[var(--border)] whitespace-nowrap max-w-xs truncate"
                                                title={String(row[col] ?? "")}
                                            >
                                                {String(row[col] ?? "")}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
