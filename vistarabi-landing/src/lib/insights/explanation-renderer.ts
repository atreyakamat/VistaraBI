// Module 5C — Explanation Renderer
// Converts KPI lineage metadata into human-readable sentences
// Deterministic — AI may rewrite for clarity but never modifies logic

// ─── Lineage Explanation ──────────────────────────────────────────

interface LineageData {
    tables: string[];
    joins: Array<{ from: string; to: string; on?: string }>;
    formula: string;
    aggregations: Array<{ function: string; column: string }>;
    filters?: string[];
}

/**
 * Render a human-readable explanation from KPI lineage data.
 * Template: "{kpiName} is calculated by {aggregation}({column}) from the {table} table,
 *            joined with {otherTable} on {joinColumn}."
 */
export function renderLineageExplanation(
    kpiName: string,
    lineage: LineageData | null | undefined,
): string {
    if (!lineage) {
        return `${formatName(kpiName)} is computed from the available data source.`;
    }

    const parts: string[] = [];

    // Opening: KPI name + formula context
    const readableName = formatName(kpiName);

    // Aggregations
    if (lineage.aggregations && lineage.aggregations.length > 0) {
        const aggDescriptions = lineage.aggregations.map(agg =>
            `${agg.function.toLowerCase()}(${agg.column})`
        );
        parts.push(`${readableName} is calculated by ${aggDescriptions.join(' and ')}`);
    } else if (lineage.formula) {
        parts.push(`${readableName} is calculated using the formula: ${lineage.formula}`);
    } else {
        parts.push(`${readableName} is derived`);
    }

    // Tables
    if (lineage.tables && lineage.tables.length > 0) {
        if (lineage.tables.length === 1) {
            parts.push(`from the ${bold(lineage.tables[0])} table`);
        } else {
            parts.push(`from the ${lineage.tables.map(t => bold(t)).join(' and ')} tables`);
        }
    }

    // Joins
    if (lineage.joins && lineage.joins.length > 0) {
        const joinDescriptions = lineage.joins.map(j => {
            if (j.on) {
                return `${j.from} ↔ ${j.to} on ${j.on}`;
            }
            return `${j.from} ↔ ${j.to}`;
        });
        parts.push(`using the join${lineage.joins.length > 1 ? 's' : ''}: ${joinDescriptions.join(', ')}`);
    }

    // Filters
    if (lineage.filters && lineage.filters.length > 0) {
        parts.push(`with filter${lineage.filters.length > 1 ? 's' : ''}: ${lineage.filters.join(', ')}`);
    }

    return parts.join(' ') + '.';
}

/**
 * Render a short trend interpretation line.
 */
export function renderTrendSummary(params: {
    kpiName: string;
    currentValue: number;
    previousValue?: number;
    deltaPercent?: number;
    trend?: 'up' | 'down' | 'flat';
}): string {
    const { kpiName, currentValue, previousValue, deltaPercent, trend } = params;
    const name = formatName(kpiName);

    if (!previousValue || deltaPercent === undefined || !trend) {
        return `${name} is currently at ${formatValue(currentValue)}.`;
    }

    if (trend === 'flat') {
        return `${name} remained stable at ${formatValue(currentValue)}.`;
    }

    const direction = trend === 'up' ? 'increased' : 'decreased';
    const absDelta = Math.abs(deltaPercent);

    return `${name} ${direction} by ${absDelta.toFixed(1)}% to ${formatValue(currentValue)} (from ${formatValue(previousValue)}).`;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function bold(text: string): string {
    return text; // Plain text — UI can bold as needed
}

function formatValue(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
}
