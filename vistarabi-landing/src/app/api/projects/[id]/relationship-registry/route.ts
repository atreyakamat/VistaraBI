import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
    buildRelationshipRegistry,
    getRelationshipRegistry,
    getOrBuildRegistry,
} from '@/lib/data-lineage/relationship-registry';

// GET /api/projects/[id]/relationship-registry - Get relationship registry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get existing registry
        const registry = await getRelationshipRegistry(id);

        if (!registry) {
            return NextResponse.json({
                projectId: id,
                status: 'NOT_GENERATED',
                message: 'Relationship registry has not been generated. Call POST to generate.',
                entries: [],
            });
        }

        // Format for API response
        return NextResponse.json({
            projectId: id,
            status: 'READY',
            version: registry.version,
            generatedAt: registry.generatedAt,
            relationships: registry.entries.map(entry => ({
                id: entry.id,
                source: {
                    tableId: entry.sourceTableId,
                    tableName: entry.sourceTableName.replace(/\.[^.]+$/, ''),
                    column: entry.sourceColumn,
                },
                target: {
                    tableId: entry.targetTableId,
                    tableName: entry.targetTableName.replace(/\.[^.]+$/, ''),
                    column: entry.targetColumn,
                },
                type: entry.relationshipType,
                cardinality: entry.joinCardinality,
                confidence: Math.round(entry.confidence * 100),
                detectionMethod: entry.detectionMethod,
                confidenceFactors: {
                    nameSimilarity: Math.round(entry.confidenceFactors.nameScore * 100),
                    valueOverlap: Math.round(entry.confidenceFactors.overlapScore * 100),
                    uniqueness: Math.round(entry.confidenceFactors.uniquenessScore * 100),
                    dataTypeMatch: Math.round(entry.confidenceFactors.dataTypeScore * 100),
                },
                aiValidation: entry.aiValidation,
                explanation: entry.explanation,
            })),
            stats: {
                totalRelationships: registry.entries.length,
                byType: {
                    primaryKey: registry.entries.filter(e => e.relationshipType === 'PRIMARY_KEY').length,
                    foreignKey: registry.entries.filter(e => e.relationshipType === 'FOREIGN_KEY').length,
                    lookup: registry.entries.filter(e => e.relationshipType === 'LOOKUP').length,
                },
                byCardinality: {
                    oneToOne: registry.entries.filter(e => e.joinCardinality === 'ONE_TO_ONE').length,
                    oneToMany: registry.entries.filter(e => e.joinCardinality === 'ONE_TO_MANY').length,
                    manyToMany: registry.entries.filter(e => e.joinCardinality === 'MANY_TO_MANY').length,
                },
                avgConfidence: registry.entries.length > 0
                    ? Math.round(registry.entries.reduce((sum, e) => sum + e.confidence, 0) / registry.entries.length * 100)
                    : 0,
            },
        });
    } catch (error) {
        console.error('Get relationship registry error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/relationship-registry - Generate/regenerate registry
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Parse options from request body
        let useAI = true;
        try {
            const body = await request.json();
            useAI = body.useAI !== false;
        } catch {
            // No body or invalid JSON, use defaults
        }

        // Check if project has sufficient sources
        const sources = await db.source.findMany({ where: { projectId: id } });
        const readySources = sources.filter(s => s.status === 'READY');

        if (readySources.length < 2) {
            return NextResponse.json({
                error: 'Need at least 2 data sources to detect relationships.',
                sourcesFound: readySources.length,
            }, { status: 400 });
        }

        // Generate registry
        console.log('[API] Building relationship registry for project:', id);
        const registry = await buildRelationshipRegistry(id, useAI);

        return NextResponse.json({
            success: true,
            projectId: id,
            version: registry.version,
            summary: {
                totalRelationships: registry.entries.length,
                highConfidence: registry.entries.filter(e => e.confidence >= 0.7).length,
                aiValidated: registry.entries.filter(e => e.detectionMethod === 'AI_VALIDATED').length,
            },
            message: `Detected ${registry.entries.length} relationships between ${readySources.length} tables`,
            generatedAt: registry.generatedAt,
        });
    } catch (error) {
        console.error('Generate relationship registry error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
