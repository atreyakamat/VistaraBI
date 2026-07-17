"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_MODE_HEADER_KEY } from '@/lib/ai/ai-mode';
import { useAIMode } from '@/lib/ai/use-ai-mode';
import { DomainBadge, renderIcon } from './DomainBadge';

interface DomainInfo {
    type: string;
    name: string;
    icon: string;
    color: string;
}

const DOMAIN_INFO: Record<string, DomainInfo> = {
    ECOMMERCE: { type: 'ECOMMERCE', name: 'E-Commerce', icon: 'shopping-cart', color: '#f97316' },
    SAAS: { type: 'SAAS', name: 'SaaS', icon: 'laptop', color: '#3b82f6' },
    EDTECH: { type: 'EDTECH', name: 'EdTech', icon: 'graduation-cap', color: '#8b5cf6' },
    RETAIL: { type: 'RETAIL', name: 'Retail', icon: 'store', color: '#22c55e' },
    SERVICES: { type: 'SERVICES', name: 'Services', icon: 'receipt', color: '#06b6d4' },
    MANUFACTURING: { type: 'MANUFACTURING', name: 'Manufacturing', icon: 'factory', color: '#6b7280' },
    HEALTHCARE: { type: 'HEALTHCARE', name: 'Healthcare', icon: 'hospital', color: '#ef4444' },
    FINANCE: { type: 'FINANCE', name: 'Finance', icon: 'dollar-sign', color: '#eab308' },
};

interface AIDomainReasoning {
    primaryDomain: string | null;
    primaryConfidence: number;
    secondaryDomain: string | null;
    secondaryConfidence: number;
    reasoning: string;
    keySignals: string[];
    processingTimeMs: number;
    ollamaModel: string;
}

interface AIGuidedSelectionProps {
    projectId: string;
    phase3ADomain: string | null;
    phase3AConfidence: number;
    onSelectDomain: (domain: string) => void;
    onClose: () => void;
}

export default function AIGuidedSelection({
    projectId,
    phase3ADomain,
    phase3AConfidence,
    onSelectDomain,
    onClose,
}: AIGuidedSelectionProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiReasoning, setAIReasoning] = useState<AIDomainReasoning | null>(null);
    const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
    const { preferLocal } = useAIMode();

    const fetchAIReasoning = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/projects/${projectId}/ai-reasoning`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    [AI_MODE_HEADER_KEY]: preferLocal ? 'local' : 'cloud',
                },
                body: JSON.stringify({ preferLocal }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to get AI reasoning');
                setOllamaAvailable(data.ollamaAvailable ?? false);
                return;
            }

            setAIReasoning(data.aiReasoning);
            setOllamaAvailable(true);
        } catch (err) {
            setError('Failed to connect to AI service');
            setOllamaAvailable(false);
        } finally {
            setLoading(false);
        }
    };

    const phase3AInfo = phase3ADomain ? DOMAIN_INFO[phase3ADomain] : null;
    const aiPrimaryInfo = aiReasoning?.primaryDomain ? DOMAIN_INFO[aiReasoning.primaryDomain] : null;
    const aiSecondaryInfo = aiReasoning?.secondaryDomain ? DOMAIN_INFO[aiReasoning.secondaryDomain] : null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl animate-pulse">
                                🧠
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                                    AI Domain Intelligence
                                </h2>
                                <p className="text-sm text-[var(--muted)]">
                                    Powered by {preferLocal ? 'local Ollama' : 'cloud Groq'} • {preferLocal ? 'qwen3:0.6b' : 'llama-3.3-70b-versatile'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
                    {/* Phase 3A Detection */}
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--muted)]">
                            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                            <span>Rule-Based Detection (Phase 3A)</span>
                        </div>
                        {phase3AInfo ? (
                            <div className="flex items-center gap-3">
                                <span>{renderIcon(phase3AInfo.icon, 24)}</span>
                                <span className="text-lg font-bold" style={{ color: phase3AInfo.color }}>
                                    {phase3AInfo.name}
                                </span>
                                <span
                                    className="px-2 py-0.5 rounded-full text-sm font-medium"
                                    style={{ backgroundColor: `${phase3AInfo.color}20`, color: phase3AInfo.color }}
                                >
                                    {phase3AConfidence}%
                                </span>
                                {phase3AConfidence < 60 && (
                                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                                        ⚠️ Low confidence
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-[var(--muted)]">No domain detected yet</p>
                        )}
                    </div>

                    {/* AI Analysis Section */}
                    {!aiReasoning && !loading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-8"
                        >
                            <div className="text-6xl mb-4">🤖</div>
                            <h3 className="text-xl font-bold mb-2">Get AI-Powered Insights</h3>
                            <p className="text-[var(--muted)] mb-6 max-w-md mx-auto">
                                Our local AI will analyze your column names and data patterns
                                to suggest the most likely business domain with explainable reasoning.
                            </p>
                            <button
                                onClick={fetchAIReasoning}
                                className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg transition-all"
                            >
                                ✨ Analyze with AI
                            </button>
                        </motion.div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8"
                        >
                            <div className="relative w-16 h-16 mx-auto mb-4">
                                <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 animate-pulse flex items-center justify-center text-2xl">
                                    🧠
                                </div>
                            </div>
                            <p className="text-lg font-medium">Analyzing your data...</p>
                            <p className="text-sm text-[var(--muted)]">This may take a few seconds</p>
                        </motion.div>
                    )}

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-red-50 border border-red-200"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">❌</span>
                                <div>
                                    <p className="font-medium text-red-700">{error}</p>
                                    {!ollamaAvailable && (
                                        <div className="mt-2 text-sm text-red-600">
                                            <p className="font-medium">To enable AI analysis:</p>
                                            <ol className="list-decimal list-inside mt-1 space-y-1">
                                                <li>Install Ollama from <a href="https://ollama.ai" target="_blank" className="underline">ollama.ai</a></li>
                                                <li>Run: <code className="bg-red-100 px-1 rounded">ollama serve</code></li>
                                                <li>Pull model: <code className="bg-red-100 px-1 rounded">ollama pull qwen3:0.6b</code></li>
                                            </ol>
                                        </div>
                                    )}
                                    <button
                                        onClick={fetchAIReasoning}
                                        className="mt-3 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* AI Results */}
                    {aiReasoning && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            {/* AI Primary Suggestion */}
                            {aiPrimaryInfo && (
                                <div
                                    className="p-5 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
                                    style={{
                                        borderColor: aiPrimaryInfo.color,
                                        backgroundColor: `${aiPrimaryInfo.color}10`,
                                    }}
                                    onClick={() => onSelectDomain(aiReasoning.primaryDomain!)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{aiPrimaryInfo.icon}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold" style={{ color: aiPrimaryInfo.color }}>
                                                        {aiPrimaryInfo.name}
                                                    </span>
                                                    <span className="text-xs bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-2 py-0.5 rounded-full">
                                                        AI Recommended
                                                    </span>
                                                </div>
                                                <div className="text-sm text-[var(--muted)]">
                                                    {aiReasoning.primaryConfidence}% confidence
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectDomain(aiReasoning.primaryDomain!);
                                            }}
                                            className="px-4 py-2 rounded-lg font-medium text-white"
                                            style={{ backgroundColor: aiPrimaryInfo.color }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AI Secondary Suggestion */}
                            {aiSecondaryInfo && aiReasoning.secondaryConfidence > 20 && (
                                <div
                                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all"
                                    style={{
                                        borderColor: `${aiSecondaryInfo.color}40`,
                                        backgroundColor: `${aiSecondaryInfo.color}05`,
                                    }}
                                    onClick={() => onSelectDomain(aiReasoning.secondaryDomain!)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{aiSecondaryInfo.icon}</span>
                                            <div>
                                                <span className="font-medium" style={{ color: aiSecondaryInfo.color }}>
                                                    {aiSecondaryInfo.name}
                                                </span>
                                                <span className="text-sm text-[var(--muted)] ml-2">
                                                    Alternative ({aiReasoning.secondaryConfidence}%)
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectDomain(aiReasoning.secondaryDomain!);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                                            style={{
                                                borderColor: aiSecondaryInfo.color,
                                                color: aiSecondaryInfo.color,
                                            }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AI Reasoning Explanation */}
                            <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--muted)]">
                                    <span>💭</span>
                                    <span>AI Reasoning</span>
                                </div>
                                <p className="text-[var(--foreground)] leading-relaxed">
                                    {aiReasoning.reasoning}
                                </p>
                            </div>

                            {/* Key Signals */}
                            {aiReasoning.keySignals.length > 0 && (
                                <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-[var(--muted)]">
                                        <span>🔍</span>
                                        <span>Key Signals Detected</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {aiReasoning.keySignals.map((signal, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 text-sm rounded-full bg-purple-50 text-purple-700 border border-purple-200"
                                            >
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Processing Info */}
                            <div className="text-xs text-[var(--muted)] text-center">
                                Processed in {aiReasoning.processingTimeMs}ms using {aiReasoning.ollamaModel}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--card)] transition-colors"
                    >
                        Cancel
                    </button>
                    {aiReasoning && (
                        <button
                            onClick={fetchAIReasoning}
                            className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                            🔄 Re-analyze
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
