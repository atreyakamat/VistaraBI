"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DomainType } from '@/lib/domain/domain-keywords';
import { getKPIsForDomain, type KPI } from '@/lib/domain/domain-kpis';

interface DomainInfo {
    type: string;
    name: string;
    icon: string;
    color: string;
}

const DOMAIN_INFO: Record<string, DomainInfo> = {
    ECOMMERCE: { type: 'ECOMMERCE', name: 'E-Commerce', icon: '🛒', color: '#f97316' },
    SAAS: { type: 'SAAS', name: 'SaaS', icon: '💻', color: '#3b82f6' },
    EDTECH: { type: 'EDTECH', name: 'EdTech', icon: '🎓', color: '#8b5cf6' },
    RETAIL: { type: 'RETAIL', name: 'Retail', icon: '🏪', color: '#22c55e' },
    SERVICES: { type: 'SERVICES', name: 'Services', icon: '🧾', color: '#06b6d4' },
    MANUFACTURING: { type: 'MANUFACTURING', name: 'Manufacturing', icon: '🏭', color: '#6b7280' },
    HEALTHCARE: { type: 'HEALTHCARE', name: 'Healthcare', icon: '🏥', color: '#ef4444' },
    FINANCE: { type: 'FINANCE', name: 'Finance', icon: '💰', color: '#eab308' },
};

const ALL_DOMAINS = Object.keys(DOMAIN_INFO);

interface DomainSelectionProps {
    currentDomain: string | null;
    onClose: () => void;
    onConfirm: (domain: string, selectedKPIs: string[]) => void;
}

export default function DomainSelection({
    currentDomain,
    onClose,
    onConfirm,
}: DomainSelectionProps) {
    const [selectedDomain, setSelectedDomain] = useState<string>(currentDomain || ALL_DOMAINS[0]);
    const [selectedKPIs, setSelectedKPIs] = useState<Set<string>>(new Set());
    const [step, setStep] = useState<'domain' | 'kpis'>('domain');

    const domainInfo = DOMAIN_INFO[selectedDomain];
    const kpis = getKPIsForDomain(selectedDomain as DomainType);
    const coreKPIs = kpis.filter(k => k.isCore);
    const additionalKPIs = kpis.filter(k => !k.isCore);

    const toggleKPI = (kpiId: string) => {
        const newSelected = new Set(selectedKPIs);
        if (newSelected.has(kpiId)) {
            newSelected.delete(kpiId);
        } else {
            newSelected.add(kpiId);
        }
        setSelectedKPIs(newSelected);
    };

    const handleNext = () => {
        if (step === 'domain') {
            // Auto-select all core KPIs
            const coreKPIIds = coreKPIs.map(k => k.id);
            setSelectedKPIs(new Set(coreKPIIds));
            setStep('kpis');
        } else {
            onConfirm(selectedDomain, Array.from(selectedKPIs));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                                {step === 'domain' ? '🎯' : '📊'}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                                    {step === 'domain' ? 'Select Your Business Domain' : 'Choose Your KPIs'}
                                </h2>
                                <p className="text-sm text-[var(--muted)]">
                                    {step === 'domain'
                                        ? 'This helps us provide relevant insights and metrics'
                                        : 'Select the metrics you want to track'}
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

                    {/* Progress Steps */}
                    <div className="flex items-center gap-2 mt-4">
                        <div className={`flex items-center gap-2 ${step === 'domain' ? 'text-blue-500' : 'text-green-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'domain' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                                ✓
                            </div>
                            <span className="font-medium">Domain</span>
                        </div>
                        <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all ${step === 'kpis' ? 'w-full' : 'w-0'}`} />
                        </div>
                        <div className={`flex items-center gap-2 ${step === 'kpis' ? 'text-blue-500' : 'text-[var(--muted)]'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'kpis' ? 'bg-blue-500 text-white' : 'bg-[var(--border)]'}`}>
                                2
                            </div>
                            <span className="font-medium">KPIs</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
                    <AnimatePresence mode="wait">
                        {step === 'domain' ? (
                            <motion.div
                                key="domain"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="grid md:grid-cols-2 gap-3"
                            >
                                {ALL_DOMAINS.map((domain) => {
                                    const info = DOMAIN_INFO[domain];
                                    const isSelected = selectedDomain === domain;
                                    return (
                                        <motion.button
                                            key={domain}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedDomain(domain)}
                                            className={`p-4 rounded-xl border-2 transition-all text-left ${isSelected
                                                    ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg'
                                                    : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                                                }`}
                                            style={{
                                                borderColor: isSelected ? info.color : undefined,
                                                backgroundColor: isSelected ? `${info.color}10` : undefined,
                                            }}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-3xl">{info.icon}</span>
                                                <span className="text-xl font-bold" style={{ color: info.color }}>
                                                    {info.name}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[var(--muted)]">
                                                {getKPIsForDomain(domain as DomainType).length} KPIs available
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="kpis"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                {/* Selected Domain */}
                                <div className="p-4 rounded-xl border-2" style={{ borderColor: domainInfo.color, backgroundColor: `${domainInfo.color}10` }}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{domainInfo.icon}</span>
                                        <div>
                                            <div className="text-xl font-bold" style={{ color: domainInfo.color }}>
                                                {domainInfo.name}
                                            </div>
                                            <div className="text-sm text-[var(--muted)]">
                                                {selectedKPIs.size} KPIs selected
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Core KPIs */}
                                {coreKPIs.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                                            <span className="text-yellow-500">⭐</span>
                                            Core KPIs (Recommended)
                                        </h3>
                                        <div className="space-y-2">
                                            {coreKPIs.map((kpi) => (
                                                <KPICard
                                                    key={kpi.id}
                                                    kpi={kpi}
                                                    isSelected={selectedKPIs.has(kpi.id)}
                                                    onToggle={toggleKPI}
                                                    color={domainInfo.color}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Additional KPIs */}
                                {additionalKPIs.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-3">Additional KPIs</h3>
                                        <div className="space-y-2">
                                            {additionalKPIs.map((kpi) => (
                                                <KPICard
                                                    key={kpi.id}
                                                    kpi={kpi}
                                                    isSelected={selectedKPIs.has(kpi.id)}
                                                    onToggle={toggleKPI}
                                                    color={domainInfo.color}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] flex justify-between items-center bg-[var(--background)]">
                    <button
                        onClick={step === 'domain' ? onClose : () => setStep('domain')}
                        className="px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--card)] transition-colors"
                    >
                        {step === 'domain' ? 'Cancel' : 'Back'}
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg transition-all"
                    >
                        {step === 'domain' ? 'Next: Choose KPIs' : `Confirm ${selectedKPIs.size} KPIs`}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function KPICard({
    kpi,
    isSelected,
    onToggle,
    color,
}: {
    kpi: KPI;
    isSelected: boolean;
    onToggle: (id: string) => void;
    color: string;
}) {
    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            onClick={() => onToggle(kpi.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-md'
                    : 'border-[var(--border)] hover:border-[var(--accent)]/30'
                }`}
            style={{
                borderColor: isSelected ? color : undefined,
                backgroundColor: isSelected ? `${color}08` : undefined,
            }}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${isSelected ? 'border-[var(--accent)]' : 'border-[var(--border)]'
                        }`}
                    style={{
                        borderColor: isSelected ? color : undefined,
                        backgroundColor: isSelected ? color : undefined,
                    }}
                >
                    {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[var(--foreground)]">{kpi.name}</span>
                        <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                                backgroundColor: `${color}20`,
                                color: color,
                            }}
                        >
                            {kpi.category}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-1">{kpi.description}</p>
                    <p className="text-xs text-[var(--muted)] font-mono bg-[var(--background)] px-2 py-1 rounded">
                        {kpi.formula}
                    </p>
                </div>
            </div>
        </motion.button>
    );
}
