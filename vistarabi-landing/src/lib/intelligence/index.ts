// Main Intelligence Engine
// Orchestrates column analysis and relationship detection

import db from '@/lib/prisma';
import {
    normalizeColumnName,
    inferDataType,
    calculateColumnStats,
    calculateQualityScore,
} from './columns';
import { detectRelationships } from './relationships';

// Analyze a single source and store column metadata
export async function analyzeSource(sourceId: string): Promise<void> {
    const source = await db.source.findUnique({ where: { id: sourceId } });
    if (!source || source.status !== 'READY') return;

    // Delete existing column metadata for this source
    await db.columnMeta.deleteMany({ where: { sourceId } });

    const columnStats: { nullPercent: number; uniquePercent: number }[] = [];

    // Analyze each column
    for (const colName of source.columns) {
        const values = (source.data as any[]).map((row: any) => row[colName]);

        const normalizedName = normalizeColumnName(colName);
        const dataType = inferDataType(values);
        const stats = calculateColumnStats(values);

        await db.columnMeta.create({
            data: {
                sourceId,
                originalName: colName,
                normalizedName,
                dataType,
                nullPercent: stats.nullPercent,
                uniquePercent: stats.uniquePercent,
                sampleValues: stats.sampleValues as any,
            },
        });

        columnStats.push({
            nullPercent: stats.nullPercent,
            uniquePercent: stats.uniquePercent,
        });
    }

    // Calculate and update quality score
    const qualityScore = calculateQualityScore(columnStats);
    await db.source.update({
        where: { id: sourceId },
        data: { qualityScore },
    });
}

// Analyze all relationships in a project
export async function analyzeProjectRelationships(projectId: string): Promise<void> {
    // Get all ready sources in the project
    const sources = await db.source.findMany({
        where: { projectId },
    });

    const readySources = sources.filter(s => s.status === 'READY');

    if (readySources.length < 2) {
        // Need at least 2 sources for relationships
        await db.relationship.deleteMany({ where: { projectId } });
        return;
    }

    // Detect relationships
    const sourceInfos = readySources.map(s => ({
        id: s.id,
        name: s.fileName,
        columns: s.columns,
        data: s.data as any[],
    }));

    const relationships = detectRelationships(sourceInfos);

    // Clear existing relationships and store new ones
    await db.relationship.deleteMany({ where: { projectId } });

    for (const rel of relationships) {
        await db.relationship.create({
            data: {
                projectId,
                sourceAId: rel.sourceAId,
                sourceBId: rel.sourceBId,
                sourceAName: rel.sourceAName,
                sourceBName: rel.sourceBName,
                columnA: rel.columnA,
                columnB: rel.columnB,
                confidence: rel.confidence,
                matchType: rel.matchType,
            },
        });
    }
}

// Full analysis: source + project relationships
export async function runFullAnalysis(sourceId: string, preferLocal?: boolean): Promise<void> {
    const source = await db.source.findUnique({ where: { id: sourceId } });
    if (!source) return;

    // Analyze the source
    await analyzeSource(sourceId);

    // Re-analyze project relationships
    await analyzeProjectRelationships(source.projectId);
}
