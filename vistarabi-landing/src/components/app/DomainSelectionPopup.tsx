"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Laptop, GraduationCap, Store, Receipt, Factory, Hospital, DollarSign, BarChart } from 'lucide-react';

const IconMap: Record<string, React.ElementType> = {
    'shopping-cart': ShoppingCart,
    'laptop': Laptop,
    'graduation-cap': GraduationCap,
    'store': Store,
    'receipt': Receipt,
    'factory': Factory,
    'hospital': Hospital,
    'dollar-sign': DollarSign,
    'bar-chart': BarChart
};

function renderIcon(iconName: string, size?: number) {
    const Icon = IconMap[iconName] || BarChart;
    return <Icon size={size || 24} />;
}

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

const ALL_DOMAINS = Object.values(DOMAIN_INFO);

interface DomainSelectionPopupProps {
    projectId: string;
    currentDomain: string | null;
    currentConfidence: number;
    onSelectDomain: (domain: string) => void;
    onClose: () => void;
}

export default function DomainSelectionPopup({
    projectId,
    currentDomain,
    currentConfidence,
    onSelectDomain,
    onClose,
}: DomainSelectionPopupProps) {
    const [activeTab, setActiveTab] = useState<'auto' | 'ai' | 'manual'>('auto');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiReasoning, setAiReasoning] = useState<any>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [ruleDetection, setRuleDetection] = useState<any>(null);
    const [ruleLoading, setRuleLoading] = useState(false);

    // Fetch rule-based detection on mount
    useEffect(() => {
        fetchRuleDetection();
    }, [projectId]);

    const fetchRuleDetection = async () => {
        setRuleLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/domain`);
            if (res.ok) {
                const data = await res.json();
                setRuleDetection(data.domain);
            }
        } catch (err) {
            console.error('Failed to fetch rule detection:', err);
        } finally {
            setRuleLoading(false);
        }
    };

    const triggerRuleDetection = async () => {
        setRuleLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/detect-domain`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setRuleDetection(data.domain);
            }
        } catch (err) {
            console.error('Failed to trigger rule detection:', err);
        } finally {
            setRuleLoading(false);
        }
    };

    const fetchAISuggestion = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/ai-reasoning`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                setAiError(data.error || 'AI analysis failed');
                return;
            }
            setAiReasoning(data.aiReasoning);
        } catch (err) {
            setAiError('Failed to connect to AI service');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSelect = (domain: string) => {
        onSelectDomain(domain);
        onClose();
    };

    const ruleInfo = ruleDetection?.detectedDomain ? DOMAIN_INFO[ruleDetection.detectedDomain] : null;
    const aiPrimaryInfo = aiReasoning?.aiRecommendedDomain ? DOMAIN_INFO[aiReasoning.aiRecommendedDomain] : null;
    const aiSecondaryInfo = aiReasoning?.aiAlternativeDomain ? DOMAIN_INFO[aiReasoning.aiAlternativeDomain] : null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-5 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">Domain Selection</h2>
                            <p className="text-sm text-[var(--muted)]">Choose how to classify your business data</p>
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

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)]">
                    <button
                        onClick={() => setActiveTab('auto')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'auto'
                            ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        📊 Auto Detect
                    </button>
                    <button
                        onClick={() => { setActiveTab('ai'); if (!aiReasoning && !aiLoading) fetchAISuggestion(); }}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'ai'
                            ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        🧠 AI Suggestion
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'manual'
                            ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                            : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                            }`}
                    >
                        ✋ Manual
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(85vh-180px)]">
                    <AnimatePresence mode="wait">
                        {/* Auto Detect Tab */}
                        {activeTab === 'auto' && (
                            <motion.div
                                key="auto"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-[var(--muted)]">
                                    Rule-based detection analyzes your column names against business domain patterns.
                                </p>

                                {ruleLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                                    </div>
                                ) : ruleInfo ? (
                                    <div
                                        className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
                                        style={{ borderColor: ruleInfo.color, backgroundColor: `${ruleInfo.color}10` }}
                                        onClick={() => handleSelect(ruleDetection.detectedDomain)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{renderIcon(ruleInfo.icon, 32)}</span>
                                                <div>
                                                    <div className="text-lg font-bold" style={{ color: ruleInfo.color }}>
                                                        {ruleInfo.name}
                                                    </div>
                                                    <div className="text-sm text-[var(--muted)]">
                                                        {ruleDetection.confidence}% confidence • {ruleDetection.matchedColumns?.length || 0} matches
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                className="px-4 py-2 rounded-lg font-medium text-white"
                                                style={{ backgroundColor: ruleInfo.color }}
                                            >
                                                Select
                                            </button>
                                        </div>
                                        {ruleDetection.explanation && (
                                            <p className="mt-3 text-sm text-[var(--muted)] border-t border-[var(--border)] pt-3">
                                                {ruleDetection.explanation}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-[var(--muted)] mb-4">No detection results yet</p>
                                        <button
                                            onClick={triggerRuleDetection}
                                            className="px-5 py-2.5 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
                                        >
                                            🔍 Run Detection
                                        </button>
                                    </div>
                                )}

                                {ruleInfo && (
                                    <button
                                        onClick={triggerRuleDetection}
                                        className="w-full text-center text-sm text-purple-600 hover:underline"
                                    >
                                        🔄 Re-run detection
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* AI Suggestion Tab */}
                        {activeTab === 'ai' && (
                            <motion.div
                                key="ai"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <p className="text-sm text-[var(--muted)]">
                                    AI analyzes your data semantically using local Ollama (qwen3:0.6b).
                                </p>

                                {aiLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="relative w-16 h-16 mb-4">
                                            <div className="absolute inset-0 rounded-full border-4 border-cyan-200"></div>
                                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
                                            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xl animate-pulse">
                                                🧠
                                            </div>
                                        </div>
                                        <p className="text-sm text-[var(--muted)]">Analyzing with AI...</p>
                                    </div>
                                ) : aiError ? (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl">❌</span>
                                            <div>
                                                <p className="font-medium text-red-700">{aiError}</p>
                                                <p className="text-sm text-red-600 mt-1">
                                                    Make sure Ollama is running: <code className="bg-red-100 px-1 rounded">ollama serve</code>
                                                </p>
                                                <button
                                                    onClick={fetchAISuggestion}
                                                    className="mt-3 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : aiPrimaryInfo ? (
                                    <div className="space-y-3">
                                        {/* Primary AI Suggestion */}
                                        <div
                                            className="p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all"
                                            style={{ borderColor: aiPrimaryInfo.color, backgroundColor: `${aiPrimaryInfo.color}10` }}
                                            onClick={() => handleSelect(aiReasoning.aiRecommendedDomain)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{renderIcon(aiPrimaryInfo.icon, 32)}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-bold" style={{ color: aiPrimaryInfo.color }}>
                                                                {aiPrimaryInfo.name}
                                                            </span>
                                                            <span className="text-xs bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-2 py-0.5 rounded-full">
                                                                AI Recommended
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-[var(--muted)]">
                                                            {aiReasoning.aiSemanticConfidence}% confidence
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    className="px-4 py-2 rounded-lg font-medium text-white"
                                                    style={{ backgroundColor: aiPrimaryInfo.color }}
                                                    onClick={(e) => { e.stopPropagation(); handleSelect(aiReasoning.aiRecommendedDomain); }}
                                                >
                                                    Select
                                                </button>
                                            </div>
                                        </div>

                                        {/* Secondary suggestion */}
                                        {aiSecondaryInfo && aiReasoning.aiAlternativeConfidence > 20 && (
                                            <div
                                                className="p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all"
                                                style={{ borderColor: `${aiSecondaryInfo.color}40`, backgroundColor: `${aiSecondaryInfo.color}05` }}
                                                onClick={() => handleSelect(aiReasoning.aiAlternativeDomain)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{renderIcon(aiSecondaryInfo.icon, 20)}</span>
                                                        <span className="font-medium" style={{ color: aiSecondaryInfo.color }}>
                                                            {aiSecondaryInfo.name}
                                                        </span>
                                                        <span className="text-xs text-[var(--muted)]">
                                                            Alternative ({aiReasoning.aiAlternativeConfidence}%)
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="px-3 py-1.5 text-sm rounded-lg border"
                                                        style={{ borderColor: aiSecondaryInfo.color, color: aiSecondaryInfo.color }}
                                                        onClick={(e) => { e.stopPropagation(); handleSelect(aiReasoning.aiAlternativeDomain); }}
                                                    >
                                                        Select
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* AI Reasoning */}
                                        {aiReasoning.aiReasoning && (
                                            <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                                                <div className="text-xs font-medium text-[var(--muted)] mb-1">💭 AI Reasoning</div>
                                                <p className="text-sm">{aiReasoning.aiReasoning}</p>
                                            </div>
                                        )}

                                        {/* Key Signals */}
                                        {aiReasoning.aiSemanticSignals?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {aiReasoning.aiSemanticSignals.map((signal: string, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                                                        {signal}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            onClick={fetchAISuggestion}
                                            className="w-full text-center text-sm text-cyan-600 hover:underline"
                                        >
                                            🔄 Re-analyze with AI
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="text-4xl mb-3">🧠</div>
                                        <p className="text-[var(--muted)] mb-4">Click to get AI-powered domain suggestions</p>
                                        <button
                                            onClick={fetchAISuggestion}
                                            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                                        >
                                            ✨ Analyze with AI
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Manual Tab */}
                        {activeTab === 'manual' && (
                            <motion.div
                                key="manual"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-3"
                            >
                                <p className="text-sm text-[var(--muted)] mb-4">
                                    Select the domain that best describes your business data.
                                </p>

                                <div className="grid grid-cols-2 gap-3">
                                    {ALL_DOMAINS.map((domain) => (
                                        <button
                                            key={domain.type}
                                            onClick={() => handleSelect(domain.type)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${currentDomain === domain.type
                                                ? 'ring-2 ring-offset-2'
                                                : ''
                                                }`}
                                            style={{
                                                borderColor: currentDomain === domain.type ? domain.color : 'var(--border)',
                                                backgroundColor: currentDomain === domain.type ? `${domain.color}10` : 'transparent',
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{renderIcon(domain.icon, 24)}</span>
                                                <span className="font-medium" style={{ color: domain.color }}>
                                                    {domain.name}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] bg-[var(--background)]">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-lg font-medium hover:bg-[var(--card)] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
