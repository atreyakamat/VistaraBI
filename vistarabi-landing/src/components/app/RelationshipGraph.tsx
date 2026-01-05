"use client";

import { motion } from "framer-motion";

interface RelationshipData {
    id: string;
    sourceA: {
        id: string;
        name: string;
        column: string;
    };
    sourceB: {
        id: string;
        name: string;
        column: string;
    };
    confidence: number;
    matchType: string;
}

interface RelationshipGraphProps {
    relationships: RelationshipData[];
    onClose?: () => void;
}

export default function RelationshipGraph({ relationships }: RelationshipGraphProps) {
    // Extract unique sources
    const sourceMap = new Map<string, string>();
    relationships.forEach(r => {
        sourceMap.set(r.sourceA.id, r.sourceA.name);
        sourceMap.set(r.sourceB.id, r.sourceB.name);
    });
    const sources = Array.from(sourceMap.entries());

    if (relationships.length === 0) {
        return (
            <div className="bg-[var(--card)] rounded-2xl p-8 border border-[var(--border)] text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--muted)]/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No Relationships Detected</h3>
                <p className="text-[var(--muted)]">
                    Upload more related datasets to see connections
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Dataset Relationships</h2>
                <p className="text-sm text-[var(--muted)]">
                    {sources.length} datasets · {relationships.length} connections detected
                </p>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Relationship List */}
                <div className="space-y-4">
                    {relationships.map((rel) => (
                        <motion.div
                            key={rel.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]"
                        >
                            <div className="flex items-center gap-4">
                                {/* Source A */}
                                <div className="flex-1 text-right">
                                    <div className="font-medium text-[var(--foreground)] truncate">
                                        {rel.sourceA.name}
                                    </div>
                                    <div className="text-sm text-[var(--accent)] font-mono">
                                        {rel.sourceA.column}
                                    </div>
                                </div>

                                {/* Connection */}
                                <div className="flex items-center gap-2 px-4">
                                    <div className="w-8 h-0.5 bg-[var(--accent)]" />
                                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                        </svg>
                                    </div>
                                    <div className="w-8 h-0.5 bg-[var(--accent)]" />
                                </div>

                                {/* Source B */}
                                <div className="flex-1">
                                    <div className="font-medium text-[var(--foreground)] truncate">
                                        {rel.sourceB.name}
                                    </div>
                                    <div className="text-sm text-[var(--accent)] font-mono">
                                        {rel.sourceB.column}
                                    </div>
                                </div>
                            </div>

                            {/* Confidence */}
                            <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                                <span className="text-xs text-[var(--muted)]">
                                    {rel.matchType === "NAME_MATCH" ? "Column Name Match" : "Value Overlap"}
                                </span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--accent)] rounded-full"
                                            style={{ width: `${rel.confidence * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-[var(--accent)]">
                                        {Math.round(rel.confidence * 100)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
