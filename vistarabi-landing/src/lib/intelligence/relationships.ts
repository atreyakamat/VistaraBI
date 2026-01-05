// Relationship Detection Engine
// Detects connections between datasets based on column names and value overlaps

import { MatchType } from '@/lib/prisma';
import { normalizeColumnName } from './columns';

interface SourceInfo {
    id: string;
    name: string;
    columns: string[];
    data: Record<string, unknown>[];
}

interface RelationshipCandidate {
    sourceAId: string;
    sourceAName: string;
    sourceBId: string;
    sourceBName: string;
    columnA: string;
    columnB: string;
    confidence: number;
    matchType: MatchType;
}

// Detect relationships between sources in a project
export function detectRelationships(sources: SourceInfo[]): RelationshipCandidate[] {
    const relationships: RelationshipCandidate[] = [];

    // Compare each pair of sources
    for (let i = 0; i < sources.length; i++) {
        for (let j = i + 1; j < sources.length; j++) {
            const sourceA = sources[i];
            const sourceB = sources[j];

            // Find matching columns
            const matches = findColumnMatches(sourceA, sourceB);
            relationships.push(...matches);
        }
    }

    // Sort by confidence, remove duplicates
    return relationships
        .sort((a, b) => b.confidence - a.confidence)
        .filter((rel, index, self) =>
            index === self.findIndex(r =>
                r.sourceAId === rel.sourceAId &&
                r.sourceBId === rel.sourceBId &&
                r.columnA === rel.columnA &&
                r.columnB === rel.columnB
            )
        );
}

// Find matching columns between two sources
function findColumnMatches(sourceA: SourceInfo, sourceB: SourceInfo): RelationshipCandidate[] {
    const matches: RelationshipCandidate[] = [];

    for (const colA of sourceA.columns) {
        const normalizedA = normalizeColumnName(colA);

        for (const colB of sourceB.columns) {
            const normalizedB = normalizeColumnName(colB);

            // Skip if columns have generic names
            if (isGenericColumn(normalizedA) || isGenericColumn(normalizedB)) continue;

            // Check for name match
            if (normalizedA === normalizedB) {
                // Calculate value overlap for confidence
                const overlap = calculateValueOverlap(
                    sourceA.data.map(r => r[colA]),
                    sourceB.data.map(r => r[colB])
                );

                if (overlap > 0.1) { // At least 10% overlap
                    matches.push({
                        sourceAId: sourceA.id,
                        sourceAName: sourceA.name,
                        sourceBId: sourceB.id,
                        sourceBName: sourceB.name,
                        columnA: colA,
                        columnB: colB,
                        confidence: Math.min(0.9, 0.5 + overlap * 0.5), // 50-90% based on overlap
                        matchType: 'NAME_MATCH',
                    });
                }
            }

            // Check for ID-like column matches (e.g., order_id matches customer_orders.order_id)
            if (isIdColumn(normalizedA) && isIdColumn(normalizedB)) {
                const baseA = normalizedA.replace(/_id$/, '');
                const baseB = normalizedB.replace(/_id$/, '');

                if (baseA === baseB || normalizedA === normalizedB) {
                    const overlap = calculateValueOverlap(
                        sourceA.data.map(r => r[colA]),
                        sourceB.data.map(r => r[colB])
                    );

                    if (overlap > 0.05) { // At least 5% overlap for ID columns
                        const existingMatch = matches.find(m =>
                            m.columnA === colA && m.columnB === colB
                        );

                        if (!existingMatch) {
                            matches.push({
                                sourceAId: sourceA.id,
                                sourceAName: sourceA.name,
                                sourceBId: sourceB.id,
                                sourceBName: sourceB.name,
                                columnA: colA,
                                columnB: colB,
                                confidence: Math.min(0.85, 0.4 + overlap * 0.6),
                                matchType: 'VALUE_OVERLAP',
                            });
                        }
                    }
                }
            }
        }
    }

    return matches;
}

// Check if column name is too generic to be meaningful
function isGenericColumn(normalizedName: string): boolean {
    const genericNames = [
        'id', 'name', 'value', 'data', 'type', 'status',
        'created_at', 'updated_at', 'date', 'description',
        'index', 'row', 'column', 'item', 'count'
    ];
    return genericNames.includes(normalizedName);
}

// Check if column is ID-like
function isIdColumn(normalizedName: string): boolean {
    return normalizedName.endsWith('_id') || normalizedName.endsWith('_code');
}

// Calculate percentage of values that overlap between two columns
function calculateValueOverlap(valuesA: unknown[], valuesB: unknown[]): number {
    const setA = new Set(valuesA.filter(v => v !== null && v !== undefined && v !== '').map(String));
    const setB = new Set(valuesB.filter(v => v !== null && v !== undefined && v !== '').map(String));

    if (setA.size === 0 || setB.size === 0) return 0;

    let overlapCount = 0;
    for (const v of setA) {
        if (setB.has(v)) overlapCount++;
    }

    // Return overlap as percentage of smaller set
    const minSize = Math.min(setA.size, setB.size);
    return overlapCount / minSize;
}
