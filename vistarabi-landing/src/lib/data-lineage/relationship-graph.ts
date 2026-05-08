// Relationship Graph Builder - Module 4D
// Builds an entity relationship graph from project data sources

import db from '@/lib/prisma';
import type { EntityNode, EntityEdge, EntityRelationshipGraph, ForeignKeyCandidate } from './index';

// Entity type patterns - infer entity type from file/table name
const ENTITY_PATTERNS: Record<string, RegExp[]> = {
    customers: [/customer/i, /client/i, /user/i, /member/i],
    orders: [/order/i, /purchase/i, /transaction/i, /sale/i],
    products: [/product/i, /item/i, /sku/i, /inventory/i, /catalog/i],
    invoices: [/invoice/i, /bill/i, /payment/i],
    subscriptions: [/subscription/i, /plan/i, /tier/i],
    employees: [/employee/i, /staff/i, /worker/i, /team/i],
    suppliers: [/supplier/i, /vendor/i, /partner/i],
    shipments: [/shipment/i, /delivery/i, /shipping/i],
};

// Infer entity type from source name
function inferEntityType(sourceName: string): string {
    const normalized = sourceName.toLowerCase().replace(/\.[^.]+$/, ''); // Remove extension

    for (const [entityType, patterns] of Object.entries(ENTITY_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(normalized)) {
                return entityType;
            }
        }
    }

    return 'data'; // Default entity type
}

// Identify primary key candidate
function identifyPrimaryKey(columns: string[], sourceName: string): string | null {
    const normalized = sourceName.toLowerCase().replace(/\.[^.]+$/, '');

    // Look for common primary key patterns
    const pkPatterns = [
        new RegExp(`^${normalized.replace(/s$/, '')}_id$`, 'i'), // e.g., customer_id for customers.csv
        new RegExp(`^${normalized.replace(/s$/, '')}id$`, 'i'),
        /^id$/i,
        /_id$/i,
        /^pk_/i,
    ];

    for (const pattern of pkPatterns) {
        const match = columns.find(col => pattern.test(col));
        if (match) return match;
    }

    // Check for any column ending in _id that matches the entity name
    const entityBase = normalized.replace(/s$/, '');
    const entityIdCol = columns.find(col =>
        col.toLowerCase() === `${entityBase}_id` || col.toLowerCase() === `${entityBase}id`
    );

    return entityIdCol || null;
}

// Identify foreign key candidates
function identifyForeignKeys(
    columns: string[],
    primaryKey: string | null,
    allSources: { id: string; name: string; columns: string[] }[]
): ForeignKeyCandidate[] {
    const foreignKeys: ForeignKeyCandidate[] = [];

    // Look for columns that end with _id and match another source's entity type
    for (const col of columns) {
        if (col === primaryKey) continue;
        if (!/_id$/i.test(col) && !/id$/i.test(col.replace(/_/g, ''))) continue;

        const colBase = col.toLowerCase().replace(/_id$/, '').replace(/id$/, '');

        // Find a source that matches this foreign key
        for (const source of allSources) {
            const sourceBase = source.name.toLowerCase()
                .replace(/\.[^.]+$/, '')
                .replace(/s$/, '');

            if (colBase === sourceBase || colBase === sourceBase.replace(/_/g, '')) {
                // Found a match - this column likely references this source
                const referencedPK = identifyPrimaryKey(source.columns, source.name);

                if (referencedPK) {
                    foreignKeys.push({
                        column: col,
                        referencedEntity: source.id,
                        referencedColumn: referencedPK,
                        confidence: 0.8,
                    });
                }
            }
        }
    }

    return foreignKeys;
}

// Determine join type based on value distribution
function determineJoinType(
    sourceAData: Record<string, unknown>[],
    sourceBData: Record<string, unknown>[],
    columnA: string,
    columnB: string
): 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY' {
    // Count occurrences in each dataset
    const countsA = new Map<string, number>();
    const countsB = new Map<string, number>();

    for (const row of sourceAData) {
        const val = String(row[columnA] ?? '');
        countsA.set(val, (countsA.get(val) || 0) + 1);
    }

    for (const row of sourceBData) {
        const val = String(row[columnB] ?? '');
        countsB.set(val, (countsB.get(val) || 0) + 1);
    }

    const maxA = Math.max(...countsA.values(), 1);
    const maxB = Math.max(...countsB.values(), 1);

    if (maxA === 1 && maxB === 1) return 'ONE_TO_ONE';
    if (maxA === 1 || maxB === 1) return 'ONE_TO_MANY';
    return 'MANY_TO_MANY';
}

// Build entity relationship graph for a project
export async function buildEntityGraph(projectId: string): Promise<EntityRelationshipGraph> {
    console.log('[EntityGraph] Building graph for project:', projectId);

    // Get all sources
    const sources = await db.source.findMany({ where: { projectId } });
    const readySources = sources.filter(s => s.status === 'READY');

    console.log('[EntityGraph] Found', readySources.length, 'ready sources');

    // Build nodes
    const nodes: EntityNode[] = [];
    const sourceInfos = readySources.map(s => ({
        id: s.id,
        name: s.fileName,
        columns: s.columns,
        data: s.data,
    }));

    for (const source of readySources) {
        const entityType = inferEntityType(source.fileName);
        const primaryKey = identifyPrimaryKey(source.columns, source.fileName);
        const foreignKeys = identifyForeignKeys(source.columns, primaryKey, sourceInfos);

        nodes.push({
            id: source.id,
            name: source.fileName,
            entityType,
            columns: source.columns,
            primaryKeyCandidate: primaryKey,
            foreignKeys,
        });

        console.log('[EntityGraph] Node:', source.fileName, '| Entity:', entityType, '| PK:', primaryKey, '| FKs:', foreignKeys.length);
    }

    // Build edges from existing relationships + foreign key analysis
    const existingRelationships = await db.relationship.findMany({ where: { projectId } });
    const edges: EntityEdge[] = [];
    const edgeSet = new Set<string>(); // Prevent duplicates

    // Add edges from detected relationships
    for (const rel of existingRelationships) {
        const edgeKey = `${rel.sourceAId}-${rel.sourceBId}-${rel.columnA}-${rel.columnB}`;
        if (edgeSet.has(edgeKey)) continue;
        edgeSet.add(edgeKey);

        const sourceA = readySources.find(s => s.id === rel.sourceAId);
        const sourceB = readySources.find(s => s.id === rel.sourceBId);

        const joinType = sourceA && sourceB
            ? determineJoinType(sourceA.data as Record<string, unknown>[], sourceB.data as Record<string, unknown>[], rel.columnA, rel.columnB)
            : 'ONE_TO_MANY';

        edges.push({
            id: `edge-${rel.id}`,
            fromNode: rel.sourceAId,
            toNode: rel.sourceBId,
            joinType,
            joinCondition: { fromColumn: rel.columnA, toColumn: rel.columnB },
            confidence: rel.confidence,
        });
    }

    // Add edges from foreign key analysis (if not already present)
    for (const node of nodes) {
        for (const fk of node.foreignKeys) {
            const edgeKey = `${node.id}-${fk.referencedEntity}-${fk.column}-${fk.referencedColumn}`;
            const reverseKey = `${fk.referencedEntity}-${node.id}-${fk.referencedColumn}-${fk.column}`;

            if (edgeSet.has(edgeKey) || edgeSet.has(reverseKey)) continue;
            edgeSet.add(edgeKey);

            const sourceA = readySources.find(s => s.id === node.id);
            const sourceB = readySources.find(s => s.id === fk.referencedEntity);

            const joinType = sourceA && sourceB
                ? determineJoinType(sourceA.data as Record<string, unknown>[], sourceB.data as Record<string, unknown>[], fk.column, fk.referencedColumn)
                : 'ONE_TO_MANY';

            edges.push({
                id: `edge-fk-${node.id}-${fk.column}`,
                fromNode: node.id,
                toNode: fk.referencedEntity,
                joinType,
                joinCondition: { fromColumn: fk.column, toColumn: fk.referencedColumn },
                confidence: fk.confidence,
            });
        }
    }

    console.log('[EntityGraph] Built', nodes.length, 'nodes and', edges.length, 'edges');

    return {
        projectId,
        nodes,
        edges,
        createdAt: new Date(),
    };
}

// Get entity by ID from graph
export function getEntityById(graph: EntityRelationshipGraph, entityId: string): EntityNode | undefined {
    return graph.nodes.find(n => n.id === entityId);
}

// Get edges connected to a specific entity
export function getEntityEdges(graph: EntityRelationshipGraph, entityId: string): EntityEdge[] {
    return graph.edges.filter(e => e.fromNode === entityId || e.toNode === entityId);
}

// Find path between two entities
export function findEntityPath(
    graph: EntityRelationshipGraph,
    fromEntityId: string,
    toEntityId: string
): EntityEdge[] | null {
    // Simple BFS to find path
    const visited = new Set<string>();
    const queue: { nodeId: string; path: EntityEdge[] }[] = [{ nodeId: fromEntityId, path: [] }];

    while (queue.length > 0) {
        const { nodeId, path } = queue.shift()!;

        if (nodeId === toEntityId) return path;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const connectedEdges = getEntityEdges(graph, nodeId);
        for (const edge of connectedEdges) {
            const nextNode = edge.fromNode === nodeId ? edge.toNode : edge.fromNode;
            if (!visited.has(nextNode)) {
                queue.push({ nodeId: nextNode, path: [...path, edge] });
            }
        }
    }

    return null; // No path found
}
