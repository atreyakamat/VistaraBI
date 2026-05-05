"use client";

import { motion } from 'framer-motion';

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

interface DomainBadgeProps {
    domain: string | null;
    confidence: number;
    status: 'AUTO_ASSIGNED' | 'MANUAL_REQUIRED' | 'MANUALLY_SELECTED';
    onClick?: () => void;
    compact?: boolean;
}

export default function DomainBadge({
    domain,
    confidence,
    status,
    onClick,
    compact = false
}: DomainBadgeProps) {
    if (!domain) {
        return (
            <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/20 transition-colors"
            >
                <span className="text-lg">❓</span>
                <span className="font-medium">Select Domain</span>
            </motion.button>
        );
    }

    const info = DOMAIN_INFO[domain] || { name: domain, icon: 'bar-chart', color: '#6b7280' };

    const statusIcon = {
        'AUTO_ASSIGNED': '✓',
        'MANUAL_REQUIRED': '⚠',
        'MANUALLY_SELECTED': '✓',
    }[status];

    const statusLabel = {
        'AUTO_ASSIGNED': 'Auto-detected',
        'MANUAL_REQUIRED': 'Needs confirmation',
        'MANUALLY_SELECTED': 'Manually set',
    }[status];

    if (compact) {
        return (
            <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={onClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors"
                style={{
                    backgroundColor: `${info.color}15`,
                    borderColor: `${info.color}40`,
                    color: info.color,
                }}
            >
                <span>{info.icon}</span>
                <span className="font-medium">{info.name}</span>
            </motion.button>
        );
    }

    return (
        <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            onClick={onClick}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all hover:shadow-md"
            style={{
                backgroundColor: `${info.color}10`,
                borderColor: `${info.color}30`,
            }}
        >
            <span className="text-2xl">{info.icon}</span>
            <div className="text-left">
                <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: info.color }}>
                        {info.name}
                    </span>
                    <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                            backgroundColor: `${info.color}20`,
                            color: info.color,
                        }}
                    >
                        {confidence}%
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    <span>{statusIcon}</span>
                    <span>{statusLabel}</span>
                </div>
            </div>
        </motion.button>
    );
}
