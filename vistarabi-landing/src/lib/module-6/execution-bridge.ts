// Module 6A — Execution Bridge
// Maps a validated Module6Command to state-engine / Module 5.5 calls.
// NEVER mutates dashboard cards directly. NEVER imports sql-compiler or pool.
// All errors are wrapped in { success: false, error: {...} }.

import {
    upsertCard,
    removeCard,
    persistDashboardState,
    hydrateDashboard,
} from '@/lib/dashboard-state/state-engine';
import { runDashboardIntelligence } from '@/lib/dashboard-state/module-5-5';
import { MODULE6_ERROR_CODES } from './types';
import type { Module6Command, Module6Action, ExecutionResult, Module6ErrorPayload } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of AI-generated cards per dashboard session. */
const AI_CARD_LIMIT = 8;


// ─── Helper: wrap error ───────────────────────────────────────────────────────

function wrapError(
    code: string,
    message: string,
    recoverable: boolean
): ExecutionResult {
    return {
        success: false,
        action: 'CREATE_CARD' as Module6Action, // placeholder — error response has no meaningful action
        error: { code, message, recoverable },
    };
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleCreateCard(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    if (!command.kpi_id) {
        return wrapError(MODULE6_ERROR_CODES.SCHEMA_VIOLATION, 'CREATE_CARD requires kpi_id', false);
    }

    const state = await hydrateDashboard(projectId);
    if (!state) {
        return wrapError(MODULE6_ERROR_CODES.SESSION_NOT_FOUND, `No dashboard state for project "${projectId}"`, false);
    }

    // ── AI Card Cap — max 8 AI-generated cards per dashboard ──────────────────
    // User-created cards (isAIGenerated === false) do NOT count toward this limit.
    // AI cannot delete user cards to make room — the user must manually remove an AI card.
    const aiCards = state.cards.filter(c => c.isAIGenerated === true);
    if (aiCards.length >= AI_CARD_LIMIT) {
        return wrapError(
            'AI_CARD_LIMIT_REACHED',
            `AI-generated card limit (${AI_CARD_LIMIT}) reached. Please remove an AI card before creating a new one.`,
            true   // recoverable — user can remove an AI card and retry
        );
    }

    const position = state.cards.length; // append to end
    const chartType = command.chart_type || 'bar';
    const kpiName = command.natural_language_intent?.slice(0, 100) || command.kpi_id;

    const card = await upsertCard(state.id, {
        kpiId: command.kpi_id,
        kpiName,
        chartType,
        layout: { position, colSpan: 1, rowSpan: 1, cardSize: 'md' },
        groupBy: command.group_by || null,
        filterOverrides: [],
        isAIGenerated: true,
        isDrillDown: false,
        parentCardId: null,
    });

    return {
        success: true,
        action: 'CREATE_CARD',
        data: { card_id: card.id, kpi_id: card.kpiId, position },
    };
}


async function handleUpdateCard(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    if (!command.kpi_id) {
        return wrapError(MODULE6_ERROR_CODES.SCHEMA_VIOLATION, 'UPDATE_CARD requires kpi_id', false);
    }

    const state = await hydrateDashboard(projectId);
    if (!state) {
        return wrapError(MODULE6_ERROR_CODES.SESSION_NOT_FOUND, `No dashboard state for project "${projectId}"`, false);
    }

    // Find existing card — by target card_id if given, else by kpi_id
    const existing = command.target
        ? state.cards.find(c => c.id === command.target)
        : state.cards.find(c => c.kpiId === command.kpi_id);

    if (!existing) {
        return wrapError(MODULE6_ERROR_CODES.UNKNOWN_KPI, `Card not found for kpi_id "${command.kpi_id}"`, false);
    }

    const updated = await upsertCard(state.id, {
        kpiId: existing.kpiId,
        kpiName: existing.kpiName,
        chartType: command.chart_type || existing.chartType,
        layout: existing.layout,
        groupBy: command.group_by || existing.groupBy,
        filterOverrides: existing.filterOverrides,
        isAIGenerated: true,
    });

    return {
        success: true,
        action: 'UPDATE_CARD',
        data: { card_id: updated.id, chart_type: updated.chartType, group_by: updated.groupBy },
    };
}

async function handleDeleteCard(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    if (!command.kpi_id && !command.target) {
        return wrapError(MODULE6_ERROR_CODES.SCHEMA_VIOLATION, 'DELETE_CARD requires kpi_id or target', false);
    }

    const state = await hydrateDashboard(projectId);
    if (!state) {
        return wrapError(MODULE6_ERROR_CODES.SESSION_NOT_FOUND, `No dashboard state for project "${projectId}"`, false);
    }

    const kpiId = command.kpi_id ||
        state.cards.find(c => c.id === command.target)?.kpiId;

    if (!kpiId) {
        return wrapError(MODULE6_ERROR_CODES.UNKNOWN_KPI, `Could not resolve kpi_id from target "${command.target}"`, false);
    }

    await removeCard(state.id, kpiId);

    return {
        success: true,
        action: 'DELETE_CARD',
        data: { deleted_kpi_id: kpiId },
    };
}

async function handleApplyFilter(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    // Convert command.filters → businessFilters array strings
    // Filters are applied to session globalFilters only — no card mutation
    const filterExpressions: string[] = [];
    if (command.filters) {
        for (const [key, value] of Object.entries(command.filters)) {
            const values = Array.isArray(value) ? value : [value];
            filterExpressions.push(`${key}=${values.join(',')}`);
        }
    }

    // Use Module 5.5 with business filters — re-executes dashboard, updates state
    const result = await runDashboardIntelligence(projectId, {
        businessFilters: filterExpressions,
        skipCache: true,
    });

    return {
        success: true,
        action: 'APPLY_FILTER',
        data: {
            filtersApplied: filterExpressions,
            computedKPIs: result.metadata.computedKPIs,
            stateVersion: result.stateVersion,
        },
    };
}

async function handleCompare(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    if (!command.comparison) {
        return wrapError(MODULE6_ERROR_CODES.SCHEMA_VIOLATION, 'COMPARE requires comparison field', false);
    }

    const { kpi_id_a, kpi_id_b, period } = command.comparison;
    const granularity = period === 'quarterly' ? 'quarterly' : 'monthly';

    // Read-only execution of both KPIs — no state mutation
    const result = await runDashboardIntelligence(projectId, {
        cardIds: undefined, // all cards
        granularity,
        skipCache: true,
        skipSummaryGeneration: false,
        skipAnomalyDetection: false,
    });

    const kpiA = result.kpis.find(k => k.kpiId === kpi_id_a);
    const kpiB = result.kpis.find(k => k.kpiId === kpi_id_b);

    return {
        success: true,
        action: 'COMPARE',
        data: {
            kpi_id_a,
            kpi_id_b,
            period: granularity,
            kpi_a_value: kpiA?.primaryValue ?? null,
            kpi_b_value: kpiB?.primaryValue ?? null,
            kpi_a_name: kpiA?.kpiName ?? null,
            kpi_b_name: kpiB?.kpiName ?? null,
        },
    };
}

async function handleDrillDown(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    if (!command.kpi_id || !command.drill_config) {
        return wrapError(MODULE6_ERROR_CODES.SCHEMA_VIOLATION, 'DRILL_DOWN requires kpi_id and drill_config', false);
    }

    const state = await hydrateDashboard(projectId);
    if (!state) {
        return wrapError(MODULE6_ERROR_CODES.SESSION_NOT_FOUND, `No dashboard state for project "${projectId}"`, false);
    }

    // Find parent card
    const parentCard = state.cards.find(c => c.kpiId === command.kpi_id);

    // Create a drill-down card suggestion (temporary, AI-generated, drill-down flagged)
    const position = state.cards.length;
    const card = await upsertCard(state.id, {
        kpiId: command.kpi_id,
        kpiName: `Drill-down: ${command.drill_config.dimension}`,
        chartType: command.chart_type || 'bar',
        layout: { position, colSpan: 2, rowSpan: 1, cardSize: 'lg' },
        groupBy: command.drill_config.dimension,
        filterOverrides: [],
        isAIGenerated: true,
        isDrillDown: true,
        parentCardId: parentCard?.id ?? null,
    });

    return {
        success: true,
        action: 'DRILL_DOWN',
        data: {
            drill_card_id: card.id,
            parent_kpi_id: command.kpi_id,
            dimension: command.drill_config.dimension,
            filter_value: command.drill_config.value,
        },
    };
}

// ─── Main Bridge ──────────────────────────────────────────────────────────────

/**
 * Execute a validated Module6Command by delegating to the appropriate
 * state-engine / Module-5.5 API.
 *
 * NEVER imports sql-compiler, pool, or prisma directly.
 * All failures return { success: false, error: {...} } — never throws raw.
 */
export async function executeCommand(
    projectId: string,
    command: Module6Command
): Promise<ExecutionResult> {
    try {
        switch (command.action) {
            case 'CREATE_CARD': return await handleCreateCard(projectId, command);
            case 'UPDATE_CARD': return await handleUpdateCard(projectId, command);
            case 'DELETE_CARD': return await handleDeleteCard(projectId, command);
            case 'APPLY_FILTER': return await handleApplyFilter(projectId, command);
            case 'COMPARE': return await handleCompare(projectId, command);
            case 'DRILL_DOWN': return await handleDrillDown(projectId, command);

            default: {
                const exhaustive: never = command.action;
                return wrapError(
                    MODULE6_ERROR_CODES.UNSUPPORTED_ACTION,
                    `Unsupported action: ${exhaustive}`,
                    false
                );
            }
        }
    } catch (err: any) {
        // Wrap raw exceptions — never expose to caller
        const message = err instanceof Error ? err.message : 'Unknown execution error';
        return wrapError(MODULE6_ERROR_CODES.EXECUTION_FAILED, message, false);
    }
}
