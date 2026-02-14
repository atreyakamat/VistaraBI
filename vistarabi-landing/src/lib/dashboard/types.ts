// Module 5A — Dashboard Structure & Layout Engine
// Type definitions for dashboard configuration schema

import type { DomainType } from '../prisma';

// ─── Chart & Card Types ───────────────────────────────────────────

export type ChartType =
    | 'metric_card'   // Single KPI value with trend indicator
    | 'line'          // Time-series / trend charts
    | 'bar'           // Categorical comparisons / volume
    | 'pie'           // Distribution / proportional
    | 'stacked_bar'   // Multi-dimensional comparisons
    | 'table';        // Tabular / detailed breakdown

export type CardSize =
    | 'sm'    // 1/4 row — compact metric cards
    | 'md'    // 1/2 row — standard charts
    | 'lg'    // 3/4 row — wide charts
    | 'full'; // Full row — tables / complex visuals

// ─── KPI Card Configuration ──────────────────────────────────────

export interface DashboardKPICard {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    chartType: ChartType;
    cardSize: CardSize;
    position: number;         // Order within section
    confidence: number;       // From ApprovedKPI
    description?: string;
    timeGranularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    colorAccent?: string;     // Derived from domain
}

// ─── Dashboard Section ───────────────────────────────────────────

export interface DashboardSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    order: number;            // Section render order
    cards: DashboardKPICard[];
    collapsed: boolean;       // Default collapse state
}

// ─── Sidebar Navigation ──────────────────────────────────────────

export interface SidebarItem {
    id: string;
    label: string;
    icon: string;
    route: string;
    enabled: boolean;
    badge?: string;           // e.g. KPI count
    children?: SidebarItem[];
}

export interface SidebarConfig {
    projectId: string;
    projectName: string;
    items: SidebarItem[];
}

// ─── Dashboard Metadata ──────────────────────────────────────────

export interface DashboardMetadata {
    domain: DomainType | null;
    domainName: string;
    domainIcon: string;
    domainColor: string;
    totalKPIs: number;
    totalSections: number;
    generatedAt: string;
    version: number;
}

// ─── Top-Level Schema ────────────────────────────────────────────

export interface DashboardConfigSchema {
    projectId: string;
    sections: DashboardSection[];
    sidebarConfig: SidebarConfig;
    metadata: DashboardMetadata;
    version: number;
}

// ─── Section Grouping Map ────────────────────────────────────────
// Maps KPI categories to business-centric dashboard sections

export const SECTION_DEFINITIONS: {
    sectionId: string;
    title: string;
    description: string;
    icon: string;
    categories: string[];
    order: number;
}[] = [
        {
            sectionId: 'financial',
            title: 'Revenue & Financial Performance',
            description: 'Core financial KPIs tracking revenue, profitability, and monetary health',
            icon: '💰',
            categories: ['revenue', 'profitability', 'volume', 'liquidity'],
            order: 1,
        },
        {
            sectionId: 'customer',
            title: 'Customer Intelligence',
            description: 'Customer behavior, retention patterns, and lifetime value metrics',
            icon: '👥',
            categories: ['customer', 'retention'],
            order: 2,
        },
        {
            sectionId: 'operations',
            title: 'Operational Efficiency',
            description: 'Operational throughput, cost management, and process efficiency',
            icon: '⚙️',
            categories: ['operations', 'efficiency', 'cost'],
            order: 3,
        },
        {
            sectionId: 'growth',
            title: 'Growth & Engagement',
            description: 'Growth trajectory, user engagement, and adoption metrics',
            icon: '🚀',
            categories: ['growth', 'engagement'],
            order: 4,
        },
        {
            sectionId: 'performance',
            title: 'Performance Metrics',
            description: 'Quality indicators and key performance benchmarks',
            icon: '🎯',
            categories: ['performance', 'quality'],
            order: 5,
        },
        {
            sectionId: 'risk',
            title: 'Risk & Compliance',
            description: 'Risk indicators, compliance metrics, and anomaly detection',
            icon: '🛡️',
            categories: ['risk'],
            order: 6,
        },
    ];

export const FALLBACK_SECTION = {
    sectionId: 'other',
    title: 'Other Metrics',
    description: 'Additional KPIs and uncategorized metrics',
    icon: '📊',
    order: 99,
};
