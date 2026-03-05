// Module 5.5 — Drill-Down Orchestrator
// Clones an existing dashboard card, injects a category filter (column=value),
// and persists the new child card to DashboardState.
// Reuses executeKPI() from Module 5B — no new SQL logic.

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import { upsertCard } from './state-engine';
import type { DashboardCardState, NormalizedCategoryFilter, DrillDownRequest } from './types';
import type { ChartType } from '@/lib/dashboard/types';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a new drill-down card from a source card.
 * Steps:
 *   1. Load source card from DashboardState
 *   2. Clone card config
 *   3. Inject { column, value } as category filter override
 *   4. Set isDrillDown=true, parentCardId=sourceCardId
 *   5. Persist to DashboardState at next position
 *   6. Return new DashboardCardState (caller triggers executeKPI)
 *
 * Does NOT execute the KPI — returns the card config only.
 */
export async function orchestrateDrillDown(
    projectId: string,
    request: DrillDownRequest
): Promise<DashboardCardState> {
    const { sourceCardId, selectedColumn, selectedValue, chartType } = request;

    // Load source card
    const sourceCard = await db.dashboardCard.findUnique({
        where: { id: sourceCardId },
    });

    if (!sourceCard) {
        throw new Error(`[DrillDown] Source card "${sourceCardId}" not found`);
    }

    // Find the state for this project
    const state = await db.dashboardState.findUnique({
        where: { projectId },
        include: { cards: { select: { position: true } } },
    });

    if (!state) {
        throw new Error(`[DrillDown] No DashboardState found for project "${projectId}"`);
    }

    // Build the injected filter
    const drillFilter: NormalizedCategoryFilter = {
        type: 'category',
        column: selectedColumn,
        values: [selectedValue],
        label: `${selectedColumn}: ${selectedValue}`,
    };

    // Compute next position (after the last card)
    const maxPosition = state.cards.length > 0
        ? Math.max(...state.cards.map(c => c.position))
        : 0;

    const existingOverrides = (sourceCard.filterOverrides as unknown as NormalizedCategoryFilter[]) || [];

    // Determine chart type for drill-down (prefer 'bar' for categorical breakdown)
    const resolvedChartType: ChartType = chartType ||
        (isCategoricalChartType(sourceCard.chartType) ? sourceCard.chartType as ChartType : 'bar');

    // Create child card via state engine
    const childCard = await upsertCard(state.id, {
        kpiId: sourceCard.kpiId,
        kpiName: `${sourceCard.kpiName} (${selectedColumn}: ${selectedValue})`,
        chartType: resolvedChartType,
        layout: {
            position: maxPosition + 1,
            colSpan: 2,        // Drill-downs take full width by default
            rowSpan: 1,
            cardSize: 'lg',
        },
        groupBy: null,
        filterOverrides: [...existingOverrides, drillFilter],
        comparisonMode: sourceCard.comparisonMode as any,
        isPinned: false,
        isAIGenerated: false,
        isDrillDown: true,
        parentCardId: sourceCardId,
    });

    return childCard;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORICAL_CHART_TYPES = new Set(['bar', 'horizontal_bar', 'pie', 'doughnut', 'treemap']);

function isCategoricalChartType(chartType: string): boolean {
    return CATEGORICAL_CHART_TYPES.has(chartType);
}
