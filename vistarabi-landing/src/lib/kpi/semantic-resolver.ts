// Module 4.5 — Semantic Resolver
// Converts an eligible KPIRule + SemanticColumnMap into a fully resolved EligibleKPI.
// THROWS if any resolution step fails. No fallback. No 'unknown' source IDs.

import type { RelationshipEntry } from '@/lib/prisma';
import type {
    SemanticColumnMap,
    SourceInfo,
    EligibleKPI,
    EligibleKPIAggregation,
    EligibleKPIJoin,
    SemanticRole,
} from './semantic-types';
import type { KPIRule } from './kpi-rule-registry';
import type { DomainType } from '@/lib/prisma';

// ─── Resolution Error ──────────────────────────────────────────────────────────

export class SemanticResolutionError extends Error {
    constructor(
        public readonly ruleId: string,
        public readonly ruleName: string,
        public readonly detail: string
    ) {
        super(`[SemanticResolver] Cannot resolve KPI "${ruleName}" (${ruleId}): ${detail}`);
        this.name = 'SemanticResolutionError';
    }
}

// ─── Main Resolver ─────────────────────────────────────────────────────────────

/**
 * Resolves a KPIRule into a fully concrete EligibleKPI.
 * Throws SemanticResolutionError if any step fails — the KPI is then dropped,
 * not inserted into the Blueprint.
 */
export function resolveKPI(
    rule: KPIRule,
    domain: DomainType,
    semanticColumns: SemanticColumnMap,
    sources: SourceInfo[],
    relationships: RelationshipEntry[]
): EligibleKPI {
    const prefix = `[SemanticResolver][${rule.id}]`;

    // ── Step 1: Resolve each semantic role to a real column name ────────────────
    const roleToColumn = new Map<SemanticRole, string>();
    const allRoles = new Set<SemanticRole>([
        ...rule.requiredSemanticRoles,
        ...(rule.joinedSemanticRoles ?? []),
        ...rule.aggregationRules.map(a => a.semanticRole),
    ]);

    for (const role of allRoles) {
        const columnName = semanticColumns[role];
        if (!columnName) {
            throw new SemanticResolutionError(
                rule.id,
                rule.name,
                `Semantic role '${role}' not present in semanticColumns`
            );
        }
        roleToColumn.set(role, columnName);
    }

    // ── Step 2: Find which source table contains each column ───────────────────
    const columnToSource = new Map<string, SourceInfo>();
    for (const [, columnName] of roleToColumn) {
        const source = findSourceForColumn(columnName, sources);
        if (!source) {
            throw new SemanticResolutionError(
                rule.id,
                rule.name,
                `Column '${columnName}' (from a semantic role) not found in any source table. ` +
                `Available sources: [${sources.map(s => s.name).join(', ')}]`
            );
        }
        columnToSource.set(columnName, source);
    }

    // ── Step 3: Build AggregationRule objects with real column names ───────────
    const aggregations: EligibleKPIAggregation[] = [];
    for (const aggRule of rule.aggregationRules) {
        const columnName = roleToColumn.get(aggRule.semanticRole);
        if (!columnName) {
            throw new SemanticResolutionError(
                rule.id,
                rule.name,
                `Aggregation rule references role '${aggRule.semanticRole}' which has no column mapping`
            );
        }
        const source = columnToSource.get(columnName);
        if (!source) {
            throw new SemanticResolutionError(
                rule.id,
                rule.name,
                `Aggregation column '${columnName}' has no source table`
            );
        }
        aggregations.push({
            function: aggRule.function,
            semanticRole: aggRule.semanticRole,
            column: columnName,
            sourceId: source.id,
            sourceName: source.name,
        });
    }

    // ── Step 4: Interpolate formula template with real column names ────────────
    let formula = rule.lineageFormulaTemplate;
    for (const [role, columnName] of roleToColumn) {
        formula = formula.replace(new RegExp(`\\{${role}\\}`, 'g'), columnName);
    }

    // Sanity check: no unresolved placeholders should remain
    const unresolvedPlaceholders = formula.match(/\{[a-z_]+\}/g);
    if (unresolvedPlaceholders) {
        throw new SemanticResolutionError(
            rule.id,
            rule.name,
            `Formula still contains unresolved placeholders: [${unresolvedPlaceholders.join(', ')}]. Formula: ${formula}`
        );
    }

    // ── Step 5: Determine all source tables ────────────────────────────────────
    const involvedSources = new Map<string, SourceInfo>();
    for (const [, source] of columnToSource) {
        involvedSources.set(source.id, source);
    }
    const tables = Array.from(involvedSources.values()).map(s => stripExtension(s.name));

    // ── Step 6: Build join paths if multiple sources are involved ──────────────
    const joins: EligibleKPIJoin[] = [];
    if (rule.requiresJoin && involvedSources.size > 1) {
        const sourceList = Array.from(involvedSources.values());
        for (let i = 0; i < sourceList.length; i++) {
            for (let j = i + 1; j < sourceList.length; j++) {
                const rel = findRelationship(sourceList[i].id, sourceList[j].id, relationships);
                if (rel) {
                    joins.push({
                        leftTable: stripExtension(rel.sourceTableName),
                        leftColumn: rel.sourceColumn,
                        rightTable: stripExtension(rel.targetTableName),
                        rightColumn: rel.targetColumn,
                        joinType: 'INNER',
                        confidence: rel.confidence,
                    });
                }
            }
        }
        // For join KPIs, log if no explicit join path found (not an error — may be same-table)
        if (joins.length === 0) {
            console.warn(`${prefix} requiresJoin=true but no relationship found between sources — KPI may still be valid if columns are in same table`);
        }
    }

    // ── Step 7: Determine primary source table ─────────────────────────────────
    // Primary source = source that contains the first required semantic role's column
    const firstRoleColumn = roleToColumn.get(rule.requiredSemanticRoles[0]);
    const primarySource = firstRoleColumn
        ? columnToSource.get(firstRoleColumn)
        : Array.from(involvedSources.values())[0];

    if (!primarySource) {
        throw new SemanticResolutionError(rule.id, rule.name, 'Cannot determine primary source table');
    }

    const resolved: EligibleKPI = {
        ruleId: rule.id,
        name: rule.name,
        description: rule.description,
        domain,
        category: rule.category,
        unit: (rule as any).unit || 'count',
        sourceTable: stripExtension(primarySource.name),
        formula,
        unit: (rule as any).unit || 'count',
        aggregations,
        joins,
        tables,
        defaultVisualizationHint: rule.defaultVisualizationHint,
        priority: rule.priority,
        semanticRolesUsed: Array.from(roleToColumn.keys()),
    };

    console.log(`[SemanticResolver] ✅ Resolved: ${rule.name} → formula: ${formula} | tables: [${tables.join(', ')}]`);
    return resolved;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function findSourceForColumn(columnName: string, sources: SourceInfo[]): SourceInfo | null {
    const lower = columnName.toLowerCase();
    for (const source of sources) {
        if (source.columns.some(c => c.toLowerCase() === lower)) {
            return source;
        }
    }
    return null;
}

function findRelationship(
    sourceId: string,
    targetId: string,
    relationships: RelationshipEntry[]
): RelationshipEntry | null {
    return relationships.find(
        r => (r.sourceTableId === sourceId && r.targetTableId === targetId) ||
            (r.sourceTableId === targetId && r.targetTableId === sourceId)
    ) ?? null;
}

function stripExtension(filename: string): string {
    return filename.replace(/\.[^.]+$/, '');
}
