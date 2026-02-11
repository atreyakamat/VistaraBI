// Relationship Registry - Module 4D-A
// Orchestrates relationship detection, validation, and storage

import { randomUUID } from 'crypto';
import db, {
    RelationshipEntry,
    RelationshipRegistry,
    RelationshipType,
    JoinCardinality,
} from '@/lib/prisma';
import {
    detectRelationships,
    calculateConfidence,
    determineCardinality,
    determineRelationshipType,
    calculateUniquenessScore,
    generateRelationshipExplanation,
    SourceMetadata,
    RelationshipCandidate,
} from './relationship-detector';
import {
    validateRelationship,
    needsAIValidation,
    AMBIGUITY_THRESHOLD,
} from './ai-relationship-validator';

// Build relationship registry for a project
export async function buildRelationshipRegistry(
    projectId: string,
    useAI: boolean = true
): Promise<ParsedRelationshipRegistry> {
    console.log('[Registry] ========================================');
    console.log('[Registry] Building relationship registry for project:', projectId);
    console.log('[Registry] AI validation:', useAI ? 'enabled' : 'disabled');
    console.log('[Registry] ========================================');

    // Get all sources
    const sources = await db.source.findMany({ where: { projectId } });
    const readySources = sources.filter(s => s.status === 'READY');

    console.log('[Registry] Found', readySources.length, 'ready sources');

    if (readySources.length < 2) {
        console.log('[Registry] Need at least 2 sources for relationship detection');
        return createEmptyRegistry(projectId);
    }

    // Prepare source metadata
    const sourceMetadata: SourceMetadata[] = readySources.map(s => ({
        id: s.id,
        name: s.fileName,
        columns: s.columns,
        data: s.data as unknown as Record<string, unknown>[],
    }));

    // Step 1: Detect relationship candidates
    console.log('[Registry] Step 1: Detecting relationships...');
    const candidates = detectRelationships(sourceMetadata);
    console.log('[Registry] Found', candidates.length, 'candidates');

    // Step 2: Process each candidate
    console.log('[Registry] Step 2: Processing candidates...');
    const entries: RelationshipEntry[] = [];

    for (const candidate of candidates) {
        const confidence = calculateConfidence(candidate.confidenceFactors);

        // Skip low confidence relationships
        if (confidence < AMBIGUITY_THRESHOLD.min) {
            console.log('[Registry] Skipping low confidence:',
                `${candidate.sourceColumn} → ${candidate.targetColumn}`,
                `(${Math.round(confidence * 100)}%)`
            );
            continue;
        }

        // Get source data for cardinality analysis
        const sourceData = sourceMetadata.find(s => s.id === candidate.sourceTableId);
        const targetData = sourceMetadata.find(s => s.id === candidate.targetTableId);

        if (!sourceData || !targetData) continue;

        const sourceValues = sourceData.data.map(row => row[candidate.sourceColumn]);
        const targetValues = targetData.data.map(row => row[candidate.targetColumn]);

        // Determine cardinality and relationship type
        const cardinality = determineCardinality(sourceValues, targetValues);
        const sourceUniqueness = calculateUniquenessScore(sourceValues);
        const targetUniqueness = calculateUniquenessScore(targetValues);
        const relationshipType = determineRelationshipType(sourceUniqueness, targetUniqueness, cardinality);

        // Optional AI validation for ambiguous cases
        let aiValidation = undefined;
        let finalConfidence = confidence;

        if (useAI && needsAIValidation(confidence)) {
            console.log('[Registry] AI validating:',
                `${candidate.sourceColumn} → ${candidate.targetColumn}`
            );

            aiValidation = await validateRelationship(candidate, sourceValues, targetValues);

            if (aiValidation.adjustedConfidence !== undefined) {
                finalConfidence = aiValidation.adjustedConfidence;
            }

            if (!aiValidation.validated) {
                console.log('[Registry] AI rejected relationship');
                continue;
            }
        }

        // Generate explanation
        const explanation = generateRelationshipExplanation(candidate, relationshipType, cardinality);

        // Create entry
        const entry: RelationshipEntry = {
            id: `rel-${randomUUID()}`,
            projectId,
            sourceTableId: candidate.sourceTableId,
            sourceTableName: candidate.sourceTableName,
            sourceColumn: candidate.sourceColumn,
            targetTableId: candidate.targetTableId,
            targetTableName: candidate.targetTableName,
            targetColumn: candidate.targetColumn,
            relationshipType,
            joinCardinality: cardinality,
            confidence: finalConfidence,
            detectionMethod: aiValidation ? 'AI_VALIDATED' : candidate.detectionMethod,
            confidenceFactors: candidate.confidenceFactors,
            aiValidation,
            explanation,
            detectedAt: new Date(),
        };

        entries.push(entry);
        console.log('[Registry] Added:', explanation);
    }

    // Create registry
    const registry: ParsedRelationshipRegistry = {
        id: `registry-${randomUUID()}`,
        projectId,
        entries: entries as any,
        generatedAt: new Date(),
        version: 1,
    };

    // Store in database
    await storeRegistry(registry);

    console.log('[Registry] ========================================');
    console.log('[Registry] Registry complete:', entries.length, 'relationships');
    console.log('[Registry] ========================================');

    return registry;
}

// Create empty registry
function createEmptyRegistry(projectId: string): ParsedRelationshipRegistry {
    return {
        id: `registry-${randomUUID()}`,
        projectId,
        entries: [],
        generatedAt: new Date(),
        version: 1,
    };
}

// Store registry in database
async function storeRegistry(registry: ParsedRelationshipRegistry): Promise<void> {
    const data = {
        ...registry,
        entries: registry.entries as any,
    };
    await db.relationshipRegistry.upsert({
        where: { projectId: registry.projectId },
        create: data,
        update: data,
    });
    console.log('[Registry] Stored registry for project:', registry.projectId);
}

// Extended type for parsed registry
export interface ParsedRelationshipRegistry extends Omit<RelationshipRegistry, 'entries'> {
    entries: RelationshipEntry[];
}

// Get existing registry
export async function getRelationshipRegistry(projectId: string): Promise<ParsedRelationshipRegistry | null> {
    const result = await db.relationshipRegistry.findUnique({ where: { projectId } });
    if (!result) return null;
    return {
        ...result,
        entries: result.entries as unknown as RelationshipEntry[],
    };
}

// Get or build registry
export async function getOrBuildRegistry(
    projectId: string,
    forceRebuild: boolean = false,
    useAI: boolean = true
): Promise<ParsedRelationshipRegistry> {
    if (!forceRebuild) {
        const existing = await getRelationshipRegistry(projectId);
        if (existing) {
            console.log('[Registry] Returning cached registry');
            return existing;
        }
    }

    return await buildRelationshipRegistry(projectId, useAI);
}

// Get relationships for a specific source
export async function getSourceRelationships(
    projectId: string,
    sourceId: string
): Promise<RelationshipEntry[]> {
    const registry = await getRelationshipRegistry(projectId);
    if (!registry) return [];

    const connections = registry.entries.filter(
        e => e.sourceTableId === sourceId || e.targetTableId === sourceId
    );
    return connections;
}

// Find path between two sources
export async function findRelationshipPath(
    projectId: string,
    fromSourceId: string,
    toSourceId: string
): Promise<RelationshipEntry[] | null> {
    const registry = await getRelationshipRegistry(projectId);
    if (!registry) return null;

    // BFS to find path
    const visited = new Set<string>();
    const queue: { sourceId: string; path: RelationshipEntry[] }[] = [
        { sourceId: fromSourceId, path: [] }
    ];

    while (queue.length > 0) {
        const { sourceId, path } = queue.shift()!;

        if (sourceId === toSourceId) return path;
        if (visited.has(sourceId)) continue;
        visited.add(sourceId);

        const connections = registry.entries.filter(
            e => e.sourceTableId === sourceId || e.targetTableId === sourceId
        );

        for (const rel of connections) {
            const nextSource = rel.sourceTableId === sourceId
                ? rel.targetTableId
                : rel.sourceTableId;

            if (!visited.has(nextSource)) {
                queue.push({ sourceId: nextSource, path: [...path, rel] });
            }
        }
    }

    return null;
}

// Export for use in other modules
export type { SourceMetadata, RelationshipCandidate };
