// Data Lineage Engine - Module 4D
// Orchestrates entity graph building and KPI lineage tracing

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import { DataLineage } from '@prisma/client';
import { buildEntityGraph } from './relationship-graph';
import { traceAllKPILineages, getKPILineage } from './kpi-lineage';

// Types for entity relationship graph
interface ForeignKeyCandidate {
  column: string;
  referencedColumn: string;
  confidence: number;
}

interface EntityNode {
  id: string;
  name: string;
  entityType: string;
  columns: string[];
  primaryKeyCandidate: string | null;
  foreignKeys: ForeignKeyCandidate[];
  createdAt?: Date;
}

interface EntityEdge {
  id: string;
  fromNode: string;
  toNode: string;
  joinCondition: { fromColumn: string; toColumn: string };
  joinType: string;
  confidence: number;
  createdAt?: Date;
}

interface EntityRelationshipGraph {
  nodes: EntityNode[];
  edges: EntityEdge[];
  createdAt?: Date;
}

// Generate complete data lineage for a project
export async function generateDataLineage(projectId: string): Promise<DataLineage> {
    console.log('[DataLineage] ========================================');
    console.log('[DataLineage] Generating lineage for project:', projectId);
    console.log('[DataLineage] ========================================');

    // Build entity relationship graph
    console.log('[DataLineage] Step 1: Building entity graph...');
    const entityGraph = await buildEntityGraph(projectId);
    console.log('[DataLineage] Entity graph: ', entityGraph.nodes.length, 'nodes,', entityGraph.edges.length, 'edges');

    // Trace all KPI lineages
    console.log('[DataLineage] Step 2: Tracing KPI lineages...');
    const kpiLineages = await traceAllKPILineages(projectId);
    console.log('[DataLineage] Traced', kpiLineages.length, 'KPI lineages');

    // Create lineage record
    const lineage: any = {
        id: `lineage-${randomUUID()}`,
        projectId,
        entityGraph,
        kpiLineages,
        generatedAt: new Date(),
    };

    // Store in database
    await storeDataLineage(lineage);

    console.log('[DataLineage] ========================================');
    console.log('[DataLineage] Lineage generation complete');
    console.log('[DataLineage] ========================================');

    return lineage;
}

// Store data lineage in database
async function storeDataLineage(lineage: DataLineage): Promise<void> {
    await db.dataLineage.upsert({
        where: { projectId: lineage.projectId },
        create: lineage as any,
        update: lineage as any,
    });
    console.log('[DataLineage] Stored lineage for project:', lineage.projectId);
}

// Get existing data lineage for a project
export async function getDataLineage(projectId: string): Promise<DataLineage | null> {
    return await db.dataLineage.findUnique({ where: { projectId } });
}

// Get or generate data lineage
export async function getOrGenerateLineage(projectId: string, forceRegenerate: boolean = false): Promise<DataLineage> {
    if (!forceRegenerate) {
        const existing = await getDataLineage(projectId);
        if (existing) {
            console.log('[DataLineage] Returning cached lineage');
            return existing;
        }
    }

    return await generateDataLineage(projectId);
}

// Get just the entity graph for visualization
export async function getEntityGraph(projectId: string): Promise<EntityRelationshipGraph | null> {
    const lineage = await getDataLineage(projectId);
    if (lineage) {
        return lineage.entityGraph as unknown as EntityRelationshipGraph;
    }

    // Generate fresh if not exists
    return await buildEntityGraph(projectId);
}

// Get explanation for a specific KPI
export async function explainKPI(projectId: string, kpiId: string): Promise<{
    kpiId: string;
    kpiName: string;
    explanation: string;
    sources: string[];
    formula: string;
} | null> {
    const lineage = await getKPILineage(projectId, kpiId);
    if (!lineage) return null;

    return {
        kpiId: lineage.kpiId,
        kpiName: lineage.kpiName,
        explanation: lineage.explanation,
        sources: lineage.sources.map(s => s.sourceName),
        formula: lineage.formula,
    };
}

// Re-export components
export { buildEntityGraph } from './relationship-graph';
export { traceAllKPILineages, getKPILineage } from './kpi-lineage';
export type { DataLineage } from '@prisma/client';
export type { EntityRelationshipGraph, EntityNode, EntityEdge, ForeignKeyCandidate };
