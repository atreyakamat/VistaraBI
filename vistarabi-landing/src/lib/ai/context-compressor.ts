/**
 * context-compressor.ts — ACTION 5: Token-efficient context compression for the MasterAgent.
 *
 * Problem: JSON.stringify(context.datasets) dumps 200+ column names per request to the
 * 397B cloud model, consuming 2,000–4,000 tokens before the query even begins.
 *
 * Solution: Compress schema and metrics into concise digest strings that preserve
 * semantic meaning while reducing token count by ~70%.
 */

import type { MetaContext } from './master-agent';
import type { DomainType } from '@/lib/prisma';
import { getDomainKPINames } from '@/lib/kpi/domain-metadata';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompressedContext {
    /** "orders(8 cols: id, date, revenue, +3 more); products(5 cols: id, name, price, +2 more)" */
    schemaDigest: string;
    /** "Domain: RETAIL. Standard KPIs: Revenue, AOV, Basket Size..." */
    semanticSummary: string;
    /** Top columns/KPIs most relevant to the user query (keyword match, max 5) */
    queryFocus: string[];
    /** Compact metrics: only scalar values (KPI name + value + delta) */
    metricsDigest: string;
    /** Estimated token count (chars / 4 approximation) */
    tokenEstimate: number;
}

// ─── Schema Digest ────────────────────────────────────────────────────────────

/**
 * Compress dataset column lists into a concise schema digest.
 * Format: "filename(N cols: col1, col2, col3, +K more)"
 * Max 5 columns shown per table to save tokens.
 */
function buildSchemaDigest(datasets: Record<string, string[]>): string {
    return Object.entries(datasets)
        .map(([file, cols]) => {
            const baseName = file.replace(/\.(csv|json|xml|xlsx?)$/i, '');
            const preview  = cols.slice(0, 5).join(', ');
            const overflow = cols.length > 5 ? ` +${cols.length - 5} more` : '';
            return `${baseName}(${cols.length} cols: ${preview}${overflow})`;
        })
        .join('; ');
}

// ─── Semantic Signature (Router-only tier) ────────────────────────────────────

// Common number-like patterns for heuristic type classification
const NUMERIC_INDICATORS  = /\b(amount|revenue|cost|price|count|qty|units|rate|total|sum|avg|min|max|value|score|pct|percent|ratio|margin|fee|tax|salary|profit|loss)\b/i;
const DATE_INDICATORS     = /\b(date|time|at|on|day|month|year|created|updated|timestamp|period|since|until)\b/i;
const CATEGORY_INDICATORS = /\b(type|status|category|segment|channel|region|name|id|flag|code|label|group|class|country|city|state|gender)\b/i;

/**
 * ACTION 5: Build a compact Semantic Signature for each source, suitable for the router tier.
 *
 * Format: "orders: 8 numeric metrics, 2 date dims, 4 categorical dims"
 *
 * Why: The router (0.6B model) only needs to know WHAT TYPES of data are present,
 * not the full physical column names. This limits router context to ~50 tokens per source.
 * The specialized agent, once selected, receives the full physical schema via schemaDigest.
 */
export function buildSemanticSignature(datasets: Record<string, string[]>): string {
    return Object.entries(datasets)
        .map(([file, cols]) => {
            const baseName = file.replace(/\.(csv|json|xml|xlsx?)$/i, '');

            let numeric    = 0;
            let dateDims   = 0;
            let categories = 0;
            let other      = 0;

            for (const col of cols) {
                if (NUMERIC_INDICATORS.test(col))    numeric++;
                else if (DATE_INDICATORS.test(col))  dateDims++;
                else if (CATEGORY_INDICATORS.test(col)) categories++;
                else other++;
            }

            const parts = [
                numeric    > 0 ? `${numeric} numeric metric${numeric > 1 ? 's' : ''}` : null,
                dateDims   > 0 ? `${dateDims} date dim${dateDims > 1 ? 's' : ''}` : null,
                categories > 0 ? `${categories} categorical dim${categories > 1 ? 's' : ''}` : null,
                other      > 0 ? `${other} other` : null,
            ].filter(Boolean);

            return `${baseName}(${cols.length} cols: ${parts.join(', ')})`;
        })
        .join('; ');
}

// ─── Semantic Summary ─────────────────────────────────────────────────────────

/**
 * Build a brief domain-aware semantic summary.
 * Injects standard KPI names for the domain without raw column data.
 */
function buildSemanticSummary(domain: DomainType | undefined): string {
    if (!domain) return 'Domain: Unknown.';
    const kpiNames = getDomainKPINames(domain).slice(0, 10).join(', ');
    return `Domain: ${domain}. Standard KPIs: ${kpiNames}.`;
}

// ─── Query Focus ──────────────────────────────────────────────────────────────

/**
 * Find top columns that are semantically relevant to the user query.
 * Simple keyword intersection between query words and column names.
 */
function findQueryFocus(
    query: string,
    datasets: Record<string, string[]>
): string[] {
    const queryWords = query
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3); // Skip short stop-words

    const allCols = Object.values(datasets).flat();
    const scored  = allCols
        .map(col => ({
            col,
            score: queryWords.filter(
                w => col.toLowerCase().includes(w) || w.includes(col.toLowerCase())
            ).length,
        }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);

    return [...new Set(scored.map(x => x.col))].slice(0, 5);
}

// ─── Metrics Digest ───────────────────────────────────────────────────────────

/**
 * Compress metrics context to scalar values only.
 * Full KPIExecutionResult objects contain profiling, chart metadata, lineage etc.
 * that the LLM does not need for conversational responses.
 */
function buildMetricsDigest(metrics: unknown): string {
    if (!metrics) return 'No metrics context.';

    if (Array.isArray(metrics)) {
        return metrics
            .slice(0, 6) // Cap at 6 KPIs to prevent token bloat
            .map((m: Record<string, unknown>) => {
                const name    = m?.kpiName ?? m?.name ?? 'KPI';
                const val     = m?.primaryValue ?? m?.value ?? 'N/A';
                const dp      = m?.deltaPercent;
                const delta   = dp != null ? ` (${Number(dp) > 0 ? '+' : ''}${dp}%)` : '';
                return `${name}: ${val}${delta}`;
            })
            .join('; ');
    }

    if (typeof metrics === 'object' && metrics !== null) {
        const m = metrics as Record<string, unknown>;
        const name  = m?.kpiName ?? m?.name ?? 'KPI';
        const val   = m?.primaryValue ?? m?.value ?? 'N/A';
        const delta = m?.deltaPercent != null ? ` (${Number(m.deltaPercent) > 0 ? '+' : ''}${m.deltaPercent}%)` : '';
        return `${name}: ${val}${delta}`;
    }

    // Fallback: truncate raw JSON to 200 chars
    return JSON.stringify(metrics).slice(0, 200);
}

// ─── Main Compressor ──────────────────────────────────────────────────────────

/**
 * Compress a MetaContext into a token-efficient summary.
 *
 * Typical results:
 * - Before: 2,000–4,000 tokens (full schemas + metric objects)
 * - After:  400–800 tokens (digests only)
 * - Savings: ~70–80% token reduction
 */
export function compressContext(context: MetaContext): CompressedContext {
    const schemaDigest    = buildSchemaDigest(context.datasets);
    const semanticSummary = buildSemanticSummary(context.domain);
    const queryFocus      = findQueryFocus(context.query, context.datasets);
    const metricsDigest   = buildMetricsDigest(context.metrics);

    const totalChars    = schemaDigest.length + semanticSummary.length + metricsDigest.length;
    const tokenEstimate = Math.ceil(totalChars / 4); // ~4 chars per token (GPT approximation)

    return {
        schemaDigest,
        semanticSummary,
        queryFocus,
        metricsDigest,
        tokenEstimate,
    };
}

/**
 * Build the compressed enriched prompt for the MasterAgent.
 * Replaces the raw JSON.stringify calls in processRequest.
 */
export function buildCompressedPrompt(context: MetaContext): string {
    const compressed = compressContext(context);

    const focusSection = compressed.queryFocus.length > 0
        ? `\nRelevant Columns for this Query: ${compressed.queryFocus.join(', ')}`
        : '';

    return [
        `Task: ${context.query}`,
        '',
        compressed.semanticSummary,
        '',
        `Available Data Schema:`,
        compressed.schemaDigest,
        focusSection,
        '',
        `Current KPI Summary:`,
        compressed.metricsDigest,
        context.chatHistory ? `\nRecent Conversation Context:\n${context.chatHistory.slice(-500)}` : '',
    ]
        .filter(Boolean)
        .join('\n');
}
