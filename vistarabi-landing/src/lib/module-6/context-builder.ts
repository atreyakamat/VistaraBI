// Module 6A — Context Builder
// Builds an immutable, sanitized context snapshot from the current dashboard state.
// This snapshot is the ONLY data the LLM receives — never raw DB rows.
// All strings are sanitized (markdown stripped, max 500 chars) before injection.

import { createHash } from 'crypto';
import type { DashboardStateRecord } from '@/lib/dashboard-state/types';
import type { Module6Context } from './types';

// ─── Sanitization ─────────────────────────────────────────────────────────────

const MARKDOWN_PATTERN = /[#*`_~\[\]()>|\\]/g;

/**
 * Strip markdown characters and truncate to maxLen.
 * Used on all user-controlled or DB-sourced strings before LLM injection.
 */
export function sanitizeString(raw: string, maxLen = 500): string {
    return raw
        .replace(MARKDOWN_PATTERN, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

// ─── Dataset Version ID ───────────────────────────────────────────────────────

/**
 * Deterministic version hash for the current dashboard snapshot.
 * Changes whenever KPI set, version, or project changes.
 * Used to detect stale context in Stage 3 DCO validation.
 */
export function computeDatasetVersionId(
    projectId: string,
    stateVersion: number,
    kpiIds: string[]
): string {
    const sorted = [...kpiIds].sort().join(',');
    return createHash('sha256')
        .update(`${projectId}:${stateVersion}:${sorted}`)
        .digest('hex');
}

// ─── Context Builder ──────────────────────────────────────────────────────────

export interface ContextBuilderInput {
    projectId: string;
    state: DashboardStateRecord;
    intentId: string;
    /** ApprovedKPIs available for this project — subset eligible for this domain */
    eligibleKPIs: Array<{
        id: string;
        name: string;
        category: string;
        unit: string | null;
    }>;
    /** Columns available for group_by — from schema graph or domain context */
    dimensions: string[];
    /** Column names valid as filter keys */
    availableFilters: string[];
}

/**
 * Build the immutable Module6Context snapshot.
 * All strings are sanitized. The result is frozen (Object.freeze).
 */
export function buildContext(input: ContextBuilderInput): Module6Context {
    const kpiIds = input.eligibleKPIs.map(k => k.id);

    const dataset_version_id = computeDatasetVersionId(
        input.projectId,
        input.state.version,
        kpiIds
    );

    const eligible_kpis = input.eligibleKPIs.map(k => ({
        id: sanitizeString(k.id),
        name: sanitizeString(k.name),
        category: sanitizeString(k.category),
        unit: sanitizeString(k.unit || 'unknown'),
    }));

    const dimensions = input.dimensions
        .map(d => sanitizeString(d, 100))
        .filter(Boolean)
        .slice(0, 50); // Cap at 50 dimensions to prevent prompt bloat

    const available_filters = input.availableFilters
        .map(f => sanitizeString(f, 100))
        .filter(Boolean)
        .slice(0, 50);

    const current_dashboard_cards = input.state.cards.map(c => ({
        card_id: sanitizeString(c.id),
        kpi_id: sanitizeString(c.kpiId),
        kpi_name: sanitizeString(c.kpiName),
        chart_type: sanitizeString(c.chartType),
    }));

    const context: Module6Context = {
        dataset_version_id,
        intent_id: input.intentId,
        eligible_kpis,
        dimensions,
        available_filters,
        current_dashboard_cards,
    };

    // Freeze to guarantee immutability before passing to LLM
    return Object.freeze(context);
}

// ─── Context -> Prompt String ──────────────────────────────────────────────────

/**
 * Render the context snapshot as a compact JSON string for the LLM user message.
 * Separates the constraint data from the system instruction prompt.
 */
export function contextToPromptString(context: Module6Context): string {
    return JSON.stringify({
        dataset_version_id: context.dataset_version_id,
        intent_id: context.intent_id,
        eligible_kpi_ids: context.eligible_kpis.map(k => k.id),
        eligible_kpi_names: context.eligible_kpis.map(k => ({ id: k.id, name: k.name })),
        dimensions: context.dimensions,
        available_filters: context.available_filters,
        current_cards: context.current_dashboard_cards,
    }, null, 0); // Compact — no pretty-print to save tokens
}
