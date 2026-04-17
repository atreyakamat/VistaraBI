// KPI Matcher - Rule-based column→KPI matching
// Module 4 Phase 4A

import type { DomainType } from '@/lib/prisma';
import { KPIDefinition, getKPIsForDomain } from './kpi-library';

export interface ColumnMatch {
    columnName: string;
    normalizedName: string;
    matchedAlias: string;
    requiredColumn: string;
    confidence: number;
}

export interface KPIMatch {
    kpi: KPIDefinition;
    matchedColumns: ColumnMatch[];
    missingColumns: string[];
    isComputable: boolean;
    confidence: number;
    matchType: 'EXACT' | 'ALIAS' | 'PARTIAL';
    supportStatus: 'FULLY_SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'UNSUPPORTED';
}

// Normalize column name for matching
function normalizeColumnName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Match a single column against KPI aliases
function matchColumnToRequirement(
    columnName: string,
    requiredColumn: string,
    aliases: string[]
): { matched: boolean; alias: string; confidence: number } {
    const normalized = normalizeColumnName(columnName);
    const normalizedRequired = normalizeColumnName(requiredColumn);

    // Exact match
    if (normalized === normalizedRequired) {
        return { matched: true, alias: requiredColumn, confidence: 100 };
    }

    // Alias match
    for (const alias of aliases) {
        const normalizedAlias = normalizeColumnName(alias);
        if (normalized === normalizedAlias) {
            return { matched: true, alias, confidence: 95 };
        }
        // Partial contains match
        if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
            return { matched: true, alias, confidence: 75 };
        }
    }

    // Fuzzy/contains match on required column
    if (normalized.includes(normalizedRequired) || normalizedRequired.includes(normalized)) {
        return { matched: true, alias: requiredColumn, confidence: 70 };
    }

    return { matched: false, alias: '', confidence: 0 };
}

// Match project columns against a single KPI
function matchKPI(kpi: KPIDefinition, projectColumns: string[]): KPIMatch {
    const matchedColumns: ColumnMatch[] = [];
    const missingColumns: string[] = [];

    for (const requiredCol of kpi.requiredFields) {
        const aliases = kpi.columnAliases[requiredCol] || [];
        let bestMatch: ColumnMatch | null = null;

        for (const projectCol of projectColumns) {
            const result = matchColumnToRequirement(projectCol, requiredCol, aliases);
            if (result.matched && (!bestMatch || result.confidence > bestMatch.confidence)) {
                bestMatch = {
                    columnName: projectCol,
                    normalizedName: normalizeColumnName(projectCol),
                    matchedAlias: result.alias,
                    requiredColumn: requiredCol,
                    confidence: result.confidence,
                };
            }
        }

        if (bestMatch) {
            matchedColumns.push(bestMatch);
        } else {
            missingColumns.push(requiredCol);
        }
    }

    // H1 FIX: After building matchedColumns, remove any where the same physical column
    // occupies two different requiredField slots. This prevents SUM(amount) / SUM(amount) = 1.0.
    const seenPhysical = new Set<string>();
    const finalMatchedColumns: ColumnMatch[] = [];
    
    for (const mc of matchedColumns) {
        if (seenPhysical.has(mc.columnName)) {
            missingColumns.push(mc.requiredColumn);
        } else {
            seenPhysical.add(mc.columnName);
            finalMatchedColumns.push(mc);
        }
    }

    const isComputable = missingColumns.length === 0;
    const avgConfidence = finalMatchedColumns.length > 0
        ? finalMatchedColumns.reduce((sum, m) => sum + m.confidence, 0) / finalMatchedColumns.length
        : 0;

    // Adjust confidence based on completeness
    const completenessRatio = finalMatchedColumns.length / kpi.requiredFields.length;
    const confidence = Math.round(avgConfidence * completenessRatio);

    const matchType = confidence >= 95 ? 'EXACT' : confidence >= 70 ? 'ALIAS' : 'PARTIAL';
    const supportStatus = isComputable ? 'FULLY_SUPPORTED' : finalMatchedColumns.length > 0 ? 'PARTIALLY_SUPPORTED' : 'UNSUPPORTED';

    return { kpi, matchedColumns: finalMatchedColumns, missingColumns, isComputable, confidence, matchType, supportStatus };
}

// Match all KPIs for a domain against project columns
export function matchKPIsForDomain(domain: DomainType, projectColumns: string[]): KPIMatch[] {
    const kpis = getKPIsForDomain(domain);
    const matches: KPIMatch[] = [];

    for (const kpi of kpis) {
        const match = matchKPI(kpi, projectColumns);
        // We now return ALL Domain KPIs, even unsupported, so the UI can list them.
        matches.push(match);
    }

    // Sort by confidence (descending), then by priority
    return matches.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return a.kpi.priority - b.kpi.priority;
    });
}

// Get top computable KPIs
export function getComputableKPIs(matches: KPIMatch[], limit = 20): KPIMatch[] {
    return matches.filter(m => m.isComputable).slice(0, limit);
}
