// Module 5A — Section Builder (Rebuilt)
// Groups KPIs into business-centric dashboard sections
// Uses the new chart intelligence engine for chart selection

import type { ApprovedKPIWithRelations } from '../prisma';
import type { DashboardSection, DashboardKPICard, ChartSelection } from './types';
import { selectChart, profileData } from './chart-inferrer';
import { KPI_LIBRARY } from '../kpi/kpi-library';
import type { DomainType } from '../prisma';

// ─── Section Definitions ──────────────────────────────────────────

const SECTION_DEFINITIONS = [
    { sectionId: 'revenue', title: 'Revenue & Sales', description: 'Financial performance metrics', icon: '💰', order: 1, categories: ['revenue', 'sales', 'financial', 'pricing'] },
    { sectionId: 'customers', title: 'Customer Intelligence', description: 'Customer behavior and lifecycle metrics', icon: '👥', order: 2, categories: ['customer', 'user', 'retention', 'engagement', 'churn'] },
    { sectionId: 'operations', title: 'Operational Metrics', description: 'Efficiency and process metrics', icon: '⚙️', order: 3, categories: ['operational', 'efficiency', 'logistics', 'inventory', 'process'] },
    { sectionId: 'growth', title: 'Growth & Conversion', description: 'Growth trajectory and conversion metrics', icon: '📈', order: 4, categories: ['growth', 'conversion', 'acquisition', 'marketing'] },
    { sectionId: 'product', title: 'Product Analytics', description: 'Product performance and usage metrics', icon: '📦', order: 5, categories: ['product', 'catalog', 'feature', 'usage'] },
    { sectionId: 'quality', title: 'Quality & Compliance', description: 'Data quality and compliance metrics', icon: '✅', order: 6, categories: ['quality', 'compliance', 'risk', 'audit'] },
];

const FALLBACK_SECTION = {
    sectionId: 'general',
    title: 'General Metrics',
    description: 'Key business metrics',
    icon: '📊',
    order: 99,
};

/**
 * Build dashboard sections from approved KPIs.
 * Groups KPIs by category, sorts by priority, assigns chart types via profiling engine.
 */
export function buildSections(
    kpis: ApprovedKPIWithRelations[],
    domain: DomainType | null,
    domainColor: string
): DashboardSection[] {
    const priorityMap = buildPriorityMap(domain);

    // Group KPIs into sections by category
    const sectionMap = new Map<string, {
        definition: typeof SECTION_DEFINITIONS[0];
        kpis: ApprovedKPIWithRelations[];
    }>();

    for (const kpi of kpis) {
        const category = (kpi.category || '').toLowerCase();
        const sectionDef = findSectionForCategory(category);

        if (!sectionMap.has(sectionDef.sectionId)) {
            sectionMap.set(sectionDef.sectionId, {
                definition: sectionDef,
                kpis: [],
            });
        }
        sectionMap.get(sectionDef.sectionId)!.kpis.push(kpi);
    }

    // Convert to DashboardSection[], sorted by section order
    const sections: DashboardSection[] = [];

    for (const [sectionId, { definition, kpis: sectionKpis }] of sectionMap) {
        const sortedKpis = sectionKpis.sort((a, b) => {
            const idA = a.id || (a as any).kpiId;
            const idB = b.id || (b as any).kpiId;
            const prioA = priorityMap.get(idA) ?? 50;
            const prioB = priorityMap.get(idB) ?? 50;
            if (prioA !== prioB) return prioA - prioB;
            return ((b as any).confidence || 100) - ((a as any).confidence || 100);
        });

        const cards: DashboardKPICard[] = sortedKpis.map((kpi, index) => {
            // Use lightweight chart selection based on formula analysis
            // Full data profiling happens at render time with actual data
            const formulaStr = kpi.lineage?.formula || (kpi as any).formula || '';
            const categoryStr = kpi.category || 'general';
            const chartSelection = inferChartFromFormula(formulaStr, categoryStr);

            return {
                kpiId: kpi.id || (kpi as any).kpiId,
                kpiName: kpi.name || (kpi as any).kpiName,
                formula: formulaStr,
                category: categoryStr,
                chartSelection,
                cardSize: 'md' as const,
                position: index,
                confidence: (kpi as any).confidence || 100,
                colorAccent: domainColor,
            };
        });

        sections.push({
            id: sectionId,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            order: definition.order,
            cards,
            collapsed: false,
        });
    }

    sections.sort((a, b) => a.order - b.order);
    return sections;
}

/**
 * Lightweight chart inference from formula text (no data required).
 * Full data-profiling inference happens at render time.
 */
function inferChartFromFormula(formula: string, category: string): ChartSelection {
    const f = formula.toLowerCase();
    const c = category.toLowerCase();

    // Time-based KPIs
    if (f.includes('date') || f.includes('month') || f.includes('daily') || f.includes('trend')) {
        return {
            chartType: 'line', chartLibrary: 'chartjs',
            fallbackType: 'bar', fallbackLibrary: 'chartjs',
            confidence: 0.75, reason: 'Time-related formula → line chart (will refine with data)',
        };
    }

    // Percentage / ratio KPIs
    if (f.includes('/') || f.includes('rate') || f.includes('ratio') || f.includes('percent')) {
        return {
            chartType: 'doughnut', chartLibrary: 'chartjs',
            fallbackType: 'bar', fallbackLibrary: 'chartjs',
            confidence: 0.70, reason: 'Ratio/percentage formula → doughnut chart',
        };
    }

    // Count/sum aggregations
    if (/^(sum|count|total)/i.test(f) || f.includes('count(') || f.includes('sum(')) {
        return {
            chartType: 'bar', chartLibrary: 'chartjs',
            fallbackType: 'metric_card', fallbackLibrary: 'chartjs',
            confidence: 0.70, reason: 'Aggregation formula → bar chart',
        };
    }

    // Default: metric card
    return {
        chartType: 'metric_card', chartLibrary: 'chartjs',
        fallbackType: 'bar', fallbackLibrary: 'chartjs',
        confidence: 0.60, reason: 'Default selection → metric card',
    };
}

function findSectionForCategory(category: string) {
    for (const def of SECTION_DEFINITIONS) {
        if (def.categories.includes(category)) {
            return def;
        }
    }
    return { ...FALLBACK_SECTION, categories: [] as string[] };
}

function buildPriorityMap(domain: DomainType | null): Map<string, number> {
    const map = new Map<string, number>();

    if (domain && KPI_LIBRARY[domain]) {
        for (const def of KPI_LIBRARY[domain]) {
            map.set(def.id, def.priority);
        }
    }

    for (const defs of Object.values(KPI_LIBRARY)) {
        for (const def of defs) {
            if (!map.has(def.id)) {
                map.set(def.id, def.priority + 100);
            }
        }
    }

    return map;
}
