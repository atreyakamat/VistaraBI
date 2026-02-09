// Relationship Detector - Module 4D-A
// Advanced relationship detection with multi-factor confidence scoring

import {
    ConfidenceFactors,
    RelationshipType,
    DetectionMethod,
    JoinCardinality,
} from '@/lib/prisma';
import { normalizeColumnName, inferDataType, calculateColumnStats } from '@/lib/intelligence/columns';

// Candidate relationship before final scoring
export interface RelationshipCandidate {
    sourceTableId: string;
    sourceTableName: string;
    sourceColumn: string;
    targetTableId: string;
    targetTableName: string;
    targetColumn: string;
    confidenceFactors: ConfidenceFactors;
    detectionMethod: DetectionMethod;
}

// Source metadata for detection
export interface SourceMetadata {
    id: string;
    name: string;
    columns: string[];
    data: Record<string, unknown>[];
    columnStats?: Map<string, { uniquePercent: number; nullPercent: number }>;
}

// Configuration for detection thresholds
const DETECTION_CONFIG = {
    minOverlapPercent: 0.05,       // At least 5% value overlap
    minUniquenessForPK: 0.95,      // PK must be 95%+ unique
    minConfidenceThreshold: 0.4,   // Don't accept below 40%
    aiValidationThreshold: 0.7,    // Use AI for 40-70% confidence
    weights: {
        name: 0.30,
        overlap: 0.30,
        uniqueness: 0.25,
        dataType: 0.15,
    },
};

// Calculate weighted confidence from factors
export function calculateConfidence(factors: ConfidenceFactors): number {
    const { weights } = DETECTION_CONFIG;
    return (
        factors.nameScore * weights.name +
        factors.overlapScore * weights.overlap +
        factors.uniquenessScore * weights.uniqueness +
        factors.dataTypeScore * weights.dataType
    );
}

// Calculate name similarity score
export function calculateNameScore(colA: string, colB: string): number {
    const normA = normalizeColumnName(colA);
    const normB = normalizeColumnName(colB);

    // Exact match after normalization
    if (normA === normB) return 1.0;

    // Check if one is a suffix/prefix of the other (e.g., customer_id vs id)
    if (normA.endsWith(normB) || normB.endsWith(normA)) return 0.8;
    if (normA.startsWith(normB) || normB.startsWith(normA)) return 0.7;

    // Check base name match for ID columns
    const baseA = normA.replace(/_id$/, '').replace(/id$/, '');
    const baseB = normB.replace(/_id$/, '').replace(/id$/, '');
    if (baseA === baseB && baseA.length > 0) return 0.9;

    // Levenshtein-like similarity for fuzzy matching
    const longer = normA.length > normB.length ? normA : normB;
    const shorter = normA.length > normB.length ? normB : normA;
    if (longer.includes(shorter) && shorter.length >= 3) return 0.6;

    return 0;
}

// Calculate value overlap score
export function calculateOverlapScore(
    valuesA: unknown[],
    valuesB: unknown[]
): number {
    const setA = new Set(
        valuesA
            .filter(v => v !== null && v !== undefined && v !== '')
            .map(v => String(v).toLowerCase().trim())
    );
    const setB = new Set(
        valuesB
            .filter(v => v !== null && v !== undefined && v !== '')
            .map(v => String(v).toLowerCase().trim())
    );

    if (setA.size === 0 || setB.size === 0) return 0;

    let overlapCount = 0;
    for (const v of setA) {
        if (setB.has(v)) overlapCount++;
    }

    // Calculate overlap as percentage of the smaller set (likely FK)
    const minSize = Math.min(setA.size, setB.size);
    const overlapPercent = overlapCount / minSize;

    // Also consider absolute overlap for very small datasets
    const absoluteOverlapRatio = overlapCount / Math.max(setA.size, setB.size);

    // Use the higher of the two metrics
    return Math.max(overlapPercent, absoluteOverlapRatio);
}

// Calculate uniqueness score (for PK detection)
export function calculateUniquenessScore(values: unknown[]): number {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 0;

    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    return uniqueValues.size / nonNullValues.length;
}

// Calculate data type compatibility score
export function calculateDataTypeScore(
    valuesA: unknown[],
    valuesB: unknown[]
): number {
    const typeA = inferDataType(valuesA);
    const typeB = inferDataType(valuesB);

    // Exact match
    if (typeA === typeB) return 1.0;

    // Number/Text are somewhat compatible (IDs can be both)
    if (
        (typeA === 'NUMBER' && typeB === 'TEXT') ||
        (typeA === 'TEXT' && typeB === 'NUMBER')
    ) {
        return 0.7;
    }

    // Other type mismatches
    return 0.3;
}

// Determine join cardinality from value distributions
export function determineCardinality(
    sourceValues: unknown[],
    targetValues: unknown[]
): JoinCardinality {
    // Count occurrences in each column
    const sourceCounts = new Map<string, number>();
    const targetCounts = new Map<string, number>();

    for (const val of sourceValues) {
        if (val === null || val === undefined || val === '') continue;
        const key = String(val);
        sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
    }

    for (const val of targetValues) {
        if (val === null || val === undefined || val === '') continue;
        const key = String(val);
        targetCounts.set(key, (targetCounts.get(key) || 0) + 1);
    }

    const sourceMaxCount = Math.max(...sourceCounts.values(), 1);
    const targetMaxCount = Math.max(...targetCounts.values(), 1);

    if (sourceMaxCount === 1 && targetMaxCount === 1) return 'ONE_TO_ONE';
    if (sourceMaxCount === 1 || targetMaxCount === 1) return 'ONE_TO_MANY';
    return 'MANY_TO_MANY';
}

// Determine relationship type
export function determineRelationshipType(
    sourceUniqueness: number,
    targetUniqueness: number,
    cardinality: JoinCardinality
): RelationshipType {
    // If target is highly unique, it's likely a PK reference
    if (targetUniqueness >= DETECTION_CONFIG.minUniquenessForPK) {
        return 'FOREIGN_KEY';
    }

    // If source is highly unique and target is not, might be reverse
    if (sourceUniqueness >= DETECTION_CONFIG.minUniquenessForPK) {
        return 'PRIMARY_KEY';
    }

    // Otherwise it's a lookup/reference relationship
    return 'LOOKUP';
}

// Detect all relationships between sources
export function detectRelationships(sources: SourceMetadata[]): RelationshipCandidate[] {
    console.log('[RelDetector] Detecting relationships between', sources.length, 'sources');
    const candidates: RelationshipCandidate[] = [];

    // Compare each pair of sources
    for (let i = 0; i < sources.length; i++) {
        for (let j = 0; j < sources.length; j++) {
            if (i === j) continue;

            const sourceA = sources[i];
            const sourceB = sources[j];

            // Find matching columns
            const matches = findColumnMatches(sourceA, sourceB);
            candidates.push(...matches);
        }
    }

    // Sort by confidence and deduplicate
    return candidates
        .sort((a, b) => calculateConfidence(b.confidenceFactors) - calculateConfidence(a.confidenceFactors))
        .filter((rel, index, self) => {
            // Keep best match for each column pair
            return index === self.findIndex(r =>
                r.sourceTableId === rel.sourceTableId &&
                r.targetTableId === rel.targetTableId &&
                r.sourceColumn === rel.sourceColumn &&
                r.targetColumn === rel.targetColumn
            );
        });
}

// Find matching columns between two sources
function findColumnMatches(
    sourceA: SourceMetadata,
    sourceB: SourceMetadata
): RelationshipCandidate[] {
    const matches: RelationshipCandidate[] = [];

    for (const colA of sourceA.columns) {
        const normA = normalizeColumnName(colA);
        const valuesA = sourceA.data.map(row => row[colA]);

        // Skip generic columns
        if (isGenericColumn(normA)) continue;

        for (const colB of sourceB.columns) {
            const normB = normalizeColumnName(colB);
            const valuesB = sourceB.data.map(row => row[colB]);

            // Skip generic columns
            if (isGenericColumn(normB)) continue;

            // Calculate all confidence factors
            const nameScore = calculateNameScore(colA, colB);
            const overlapScore = calculateOverlapScore(valuesA, valuesB);
            const uniquenessScore = calculateUniquenessScore(valuesB); // Target uniqueness
            const dataTypeScore = calculateDataTypeScore(valuesA, valuesB);

            const factors: ConfidenceFactors = {
                nameScore,
                overlapScore,
                uniquenessScore,
                dataTypeScore,
            };

            const confidence = calculateConfidence(factors);

            // Only include if above minimum threshold
            if (confidence < DETECTION_CONFIG.minConfidenceThreshold) continue;

            // Determine detection method based on strongest factor
            let method: DetectionMethod = 'COMPOSITE';
            if (nameScore >= 0.9) method = 'NAME_MATCH';
            else if (overlapScore >= 0.8) method = 'VALUE_OVERLAP';
            else if (uniquenessScore >= 0.95) method = 'UNIQUENESS';

            matches.push({
                sourceTableId: sourceA.id,
                sourceTableName: sourceA.name,
                sourceColumn: colA,
                targetTableId: sourceB.id,
                targetTableName: sourceB.name,
                targetColumn: colB,
                confidenceFactors: factors,
                detectionMethod: method,
            });
        }
    }

    return matches;
}

// Check if column is too generic for relationship detection
function isGenericColumn(normalizedName: string): boolean {
    const genericNames = [
        'id', 'name', 'value', 'data', 'type', 'status',
        'created_at', 'updated_at', 'date', 'description',
        'index', 'row', 'column', 'item', 'count', 'total',
        'note', 'notes', 'comment', 'comments', 'flag',
    ];
    return genericNames.includes(normalizedName);
}

// Check if a column looks like an ID column
export function isIdColumn(columnName: string): boolean {
    const normalized = normalizeColumnName(columnName);
    return (
        normalized.endsWith('_id') ||
        normalized.endsWith('_code') ||
        normalized.endsWith('_key') ||
        normalized === 'id' ||
        normalized.endsWith('_uuid')
    );
}

// Generate human-readable explanation for a relationship
export function generateRelationshipExplanation(
    candidate: RelationshipCandidate,
    relationshipType: RelationshipType,
    cardinality: JoinCardinality
): string {
    const sourceTable = candidate.sourceTableName.replace(/\.[^.]+$/, '');
    const targetTable = candidate.targetTableName.replace(/\.[^.]+$/, '');
    const confidence = calculateConfidence(candidate.confidenceFactors);
    const confidencePercent = Math.round(confidence * 100);

    const cardinalityText = {
        'ONE_TO_ONE': 'one-to-one',
        'ONE_TO_MANY': 'one-to-many',
        'MANY_TO_MANY': 'many-to-many',
    }[cardinality];

    const methodText = {
        'NAME_MATCH': 'column name similarity',
        'VALUE_OVERLAP': 'value overlap analysis',
        'UNIQUENESS': 'uniqueness pattern',
        'AI_VALIDATED': 'AI validation',
        'COMPOSITE': 'multiple factors',
    }[candidate.detectionMethod];

    return `${sourceTable}.${candidate.sourceColumn} → ${targetTable}.${candidate.targetColumn}: ` +
        `${cardinalityText} relationship detected via ${methodText} ` +
        `(${confidencePercent}% confidence)`;
}

// Export configuration for testing
export { DETECTION_CONFIG };
