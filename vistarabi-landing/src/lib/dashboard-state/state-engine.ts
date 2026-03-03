// Module 5.5 — Dashboard State Engine
// Hydrates, persists, and manages the versioned dashboard state.
// Sits above the execution layer — no SQL, no Blueprint access.

import db from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type {
    DashboardStateRecord,
    DashboardCardState,
    NormalizedFilter,
    CardLayout,
    ComparisonMode,
} from './types';
import type { ChartType } from '@/lib/dashboard/types';
import type { TimeGranularity } from '@/lib/visualization/types';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load the persisted DashboardState for a project.
 * If no state exists, attempts to seed from existing DashboardConfig.
 * Returns null only if the project has no config at all.
 */
export async function hydrateDashboard(projectId: string): Promise<DashboardStateRecord | null> {
    const existing = await db.dashboardState.findUnique({
        where: { projectId },
        include: { cards: { orderBy: { position: 'asc' } } },
    });

    if (existing) {
        return mapStateToRecord(existing);
    }

    // Seed from existing DashboardConfig if available
    const config = await (db as any).dashboardConfig.findUnique({ where: { projectId } });
    if (!config) return null;

    return seedStateFromConfig(projectId, config);
}

/**
 * Persist (upsert) the full dashboard state for a project.
 * Increments version on every write.
 */
export async function persistDashboardState(
    projectId: string,
    partial: {
        domain?: string;
        globalFilters?: NormalizedFilter[];
        granularity?: TimeGranularity;
    }
): Promise<DashboardStateRecord> {
    const existing = await db.dashboardState.findUnique({ where: { projectId } });

    const state = await db.dashboardState.upsert({
        where: { projectId },
        create: {
            id: randomUUID(),
            projectId,
            domain: partial.domain || 'GENERAL',
            globalFilters: (partial.globalFilters || []) as any,
            granularity: partial.granularity || 'monthly',
            version: 1,
        },
        update: {
            domain: partial.domain ?? undefined,
            globalFilters: partial.globalFilters ? (partial.globalFilters as any) : undefined,
            granularity: partial.granularity ?? undefined,
            version: (existing?.version || 0) + 1,
        },
        include: { cards: { orderBy: { position: 'asc' } } },
    });

    return mapStateToRecord(state);
}

/**
 * Upsert a single card in the dashboard state.
 * Finds card by kpiId in this state, or creates a new one.
 */
export async function upsertCard(
    stateId: string,
    card: {
        kpiId: string;
        kpiName: string;
        chartType: ChartType;
        layout: CardLayout;
        groupBy?: string | null;
        filterOverrides?: NormalizedFilter[];
        comparisonMode?: ComparisonMode;
        isPinned?: boolean;
        isAIGenerated?: boolean;
        isDrillDown?: boolean;
        parentCardId?: string | null;
    }
): Promise<DashboardCardState> {
    const existing = await db.dashboardCard.findFirst({
        where: { stateId, kpiId: card.kpiId, isDrillDown: false },
    });

    let saved;
    if (existing) {
        saved = await db.dashboardCard.update({
            where: { id: existing.id },
            data: {
                kpiName: card.kpiName,
                chartType: card.chartType,
                cardSize: card.layout.cardSize,
                position: card.layout.position,
                colSpan: card.layout.colSpan,
                rowSpan: card.layout.rowSpan,
                groupBy: card.groupBy ?? null,
                filterOverrides: (card.filterOverrides || []) as any,
                comparisonMode: card.comparisonMode ?? null,
                isPinned: card.isPinned ?? existing.isPinned,
                isAIGenerated: card.isAIGenerated ?? existing.isAIGenerated,
            },
        });
    } else {
        saved = await db.dashboardCard.create({
            data: {
                id: randomUUID(),
                stateId,
                kpiId: card.kpiId,
                kpiName: card.kpiName,
                chartType: card.chartType,
                cardSize: card.layout.cardSize,
                position: card.layout.position,
                colSpan: card.layout.colSpan,
                rowSpan: card.layout.rowSpan,
                groupBy: card.groupBy ?? null,
                filterOverrides: (card.filterOverrides || []) as any,
                comparisonMode: card.comparisonMode ?? null,
                isPinned: card.isPinned ?? false,
                isAIGenerated: card.isAIGenerated ?? false,
                isDrillDown: card.isDrillDown ?? false,
                parentCardId: card.parentCardId ?? null,
            },
        });
    }

    return mapCardToState(saved);
}

/**
 * Toggle pin state on a card.
 */
export async function pinCard(cardId: string, pinned: boolean): Promise<DashboardCardState> {
    const saved = await db.dashboardCard.update({
        where: { id: cardId },
        data: { isPinned: pinned },
    });
    return mapCardToState(saved);
}

/**
 * Remove a card from dashboard state.
 * Called when the corresponding KPI is removed from the blueprint.
 */
export async function removeCard(stateId: string, kpiId: string): Promise<void> {
    await db.dashboardCard.deleteMany({ where: { stateId, kpiId } });
}

/**
 * Get the current version of the dashboard state.
 */
export async function getStateVersion(projectId: string): Promise<number> {
    const state = await db.dashboardState.findUnique({
        where: { projectId },
        select: { version: true },
    });
    return state?.version ?? 0;
}

// ─── Internal: Seed from Config ───────────────────────────────────────────────

async function seedStateFromConfig(projectId: string, config: any): Promise<DashboardStateRecord> {
    const sections = config.sections as any[];
    const meta = config.metadata as any;

    const state = await db.dashboardState.create({
        data: {
            id: randomUUID(),
            projectId,
            domain: meta?.domain || 'GENERAL',
            globalFilters: [] as any,
            granularity: 'monthly',
            version: 1,
        },
        include: { cards: true },
    });

    // Flatten all cards from sections
    let position = 0;
    const cardInserts: Promise<any>[] = [];
    for (const section of sections) {
        for (const card of section.cards || []) {
            const chartType = card.chartSelection?.chartType || 'metric_card';
            cardInserts.push(
                db.dashboardCard.create({
                    data: {
                        id: randomUUID(),
                        stateId: state.id,
                        kpiId: card.kpiId,
                        kpiName: card.kpiName,
                        chartType,
                        cardSize: card.cardSize || 'md',
                        position: position++,
                        colSpan: 1,
                        rowSpan: 1,
                        groupBy: null,
                        filterOverrides: [] as any,
                        comparisonMode: null,
                        isPinned: false,
                        isAIGenerated: false,
                        isDrillDown: false,
                        parentCardId: null,
                    },
                })
            );
        }
    }

    await Promise.all(cardInserts);

    const hydrated = await db.dashboardState.findUnique({
        where: { id: state.id },
        include: { cards: { orderBy: { position: 'asc' } } },
    });

    return mapStateToRecord(hydrated!);
}

// ─── Internal: DB → Type Mappers ──────────────────────────────────────────────

function mapStateToRecord(db: any): DashboardStateRecord {
    return {
        id: db.id,
        projectId: db.projectId,
        domain: db.domain,
        version: db.version,
        globalFilters: (db.globalFilters as NormalizedFilter[]) || [],
        granularity: db.granularity as TimeGranularity,
        cards: (db.cards || []).map(mapCardToState),
        createdAt: db.createdAt instanceof Date ? db.createdAt.toISOString() : db.createdAt,
        updatedAt: db.updatedAt instanceof Date ? db.updatedAt.toISOString() : db.updatedAt,
    };
}

function mapCardToState(card: any): DashboardCardState {
    return {
        id: card.id,
        stateId: card.stateId,
        kpiId: card.kpiId,
        kpiName: card.kpiName,
        chartType: card.chartType as ChartType,
        layout: {
            position: card.position,
            colSpan: card.colSpan as 1 | 2 | 3 | 4,
            rowSpan: card.rowSpan as 1 | 2,
            cardSize: card.cardSize,
        },
        groupBy: card.groupBy,
        filterOverrides: (card.filterOverrides as NormalizedFilter[]) || [],
        comparisonMode: card.comparisonMode as ComparisonMode,
        isPinned: card.isPinned,
        isAIGenerated: card.isAIGenerated,
        isDrillDown: card.isDrillDown,
        parentCardId: card.parentCardId,
        createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
        updatedAt: card.updatedAt instanceof Date ? card.updatedAt.toISOString() : card.updatedAt,
    };
}
