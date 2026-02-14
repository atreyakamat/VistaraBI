// Module 5A — Section Builder
// Groups KPIs into business-centric dashboard sections

import type { ApprovedKPI } from '../prisma';
import type { DashboardSection, DashboardKPICard } from './types';
import { SECTION_DEFINITIONS, FALLBACK_SECTION } from './types';
import { inferChartType } from './chart-inferrer';
import { KPI_LIBRARY } from '../kpi/kpi-library';
import type { DomainType } from '../prisma';

/**
 * Build dashboard sections from approved KPIs.
 * Groups KPIs by category into business-centric sections,
 * sorts by priority, and assigns chart types.
 */
export function buildSections(
    kpis: ApprovedKPI[],
    domain: DomainType | null,
    domainColor: string
): DashboardSection[] {
    // Step 1: Build a priority lookup from the KPI library
    const priorityMap = buildPriorityMap(domain);

    // Step 2: Assign each KPI to a section based on its category
    const sectionMap = new Map<string, {
        definition: typeof SECTION_DEFINITIONS[0];
        kpis: ApprovedKPI[];
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

    // Step 3: Convert to DashboardSection[], sorted by section order
    const sections: DashboardSection[] = [];

    for (const [sectionId, { definition, kpis: sectionKpis }] of sectionMap) {
        // Sort KPIs within section: by priority (from library), then by confidence
        const sortedKpis = sectionKpis.sort((a, b) => {
            const prioA = priorityMap.get(a.kpiId) ?? 50;
            const prioB = priorityMap.get(b.kpiId) ?? 50;
            if (prioA !== prioB) return prioA - prioB;
            return (b.confidence || 0) - (a.confidence || 0);
        });

        // Build cards
        const cards: DashboardKPICard[] = sortedKpis.map((kpi, index) => {
            const { chartType, cardSize } = inferChartType(kpi.formula, kpi.category);
            return {
                kpiId: kpi.kpiId,
                kpiName: kpi.kpiName,
                formula: kpi.formula,
                category: kpi.category,
                chartType,
                cardSize,
                position: index,
                confidence: kpi.confidence,
                timeGranularity: 'monthly' as const,
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

    // Sort sections by order
    sections.sort((a, b) => a.order - b.order);

    return sections;
}

/**
 * Find the section definition for a given KPI category.
 */
function findSectionForCategory(category: string) {
    for (const def of SECTION_DEFINITIONS) {
        if (def.categories.includes(category)) {
            return def;
        }
    }
    return { ...FALLBACK_SECTION, categories: [] as string[] };
}

/**
 * Build a Map<kpiId, priority> from the KPI library for the given domain.
 * This allows us to sort KPIs by their library-defined priority.
 */
function buildPriorityMap(domain: DomainType | null): Map<string, number> {
    const map = new Map<string, number>();

    if (domain && KPI_LIBRARY[domain]) {
        for (const def of KPI_LIBRARY[domain]) {
            map.set(def.id, def.priority);
        }
    }

    // Also index all domains as fallback (for AI-proposed KPIs)
    for (const defs of Object.values(KPI_LIBRARY)) {
        for (const def of defs) {
            if (!map.has(def.id)) {
                map.set(def.id, def.priority + 100); // Lower priority than domain-native
            }
        }
    }

    return map;
}
