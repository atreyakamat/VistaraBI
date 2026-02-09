# Module 4 Phase 4D: Data Lineage & Relationship Intelligence

## Overview

Module 4D is the **intelligence bridge** that transforms VistaraBI from a system that merely calculates KPIs into a platform that **understands, connects, and explains** how those KPIs are derived from business data.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Data Lineage Engine                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │  Entity Graph   │    │   KPI Lineage   │    │  Explanation│  │
│  │    Builder      │───▶│     Tracer      │───▶│   Generator │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
│                                                                  │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DataLineage Record                          │    │
│  │  • EntityRelationshipGraph (nodes + edges)              │    │
│  │  • KPILineage[] with explanations                       │    │
│  │  • Source-to-KPI data flow traces                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Endpoints                               │    │
│  │  • GET/POST /api/projects/[id]/data-lineage             │    │
│  │  • GET /api/projects/[id]/entity-graph                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Entity Relationship Graph (`relationship-graph.ts`)

Builds a graph of data sources (tables/files) and their relationships:

| Feature | Description |
|---------|-------------|
| **Entity Type Inference** | Detects entity types from file names (customers, orders, products, etc.) |
| **Primary Key Detection** | Identifies primary key candidates using naming patterns |
| **Foreign Key Discovery** | Finds foreign key relationships between sources |
| **Join Type Analysis** | Determines ONE_TO_ONE, ONE_TO_MANY, or MANY_TO_MANY relationships |

### 2. KPI Lineage Tracer (`kpi-lineage.ts`)

Traces each KPI back to its data sources:

| Feature | Description |
|---------|-------------|
| **Formula Parsing** | Extracts aggregations (SUM, AVG, COUNT) from formulas |
| **Source Mapping** | Maps each column to its source file |
| **Join Tracing** | Identifies how sources are joined for multi-table KPIs |
| **Explanation Generation** | Creates human-readable "How was this calculated?" text |

### 3. Data Lineage Orchestrator (`index.ts`)

Coordinates graph building and lineage tracing:

```typescript
// Generate complete lineage for a project
const lineage = await generateDataLineage(projectId);

// Get explanation for a specific KPI
const explanation = await explainKPI(projectId, kpiId);
```

## Data Structures

### EntityRelationshipGraph

```typescript
interface EntityRelationshipGraph {
    projectId: string;
    nodes: EntityNode[];     // Data sources as nodes
    edges: EntityEdge[];     // Relationships as edges
    createdAt: Date;
}
```

### KPILineage

```typescript
interface KPILineage {
    kpiId: string;
    kpiName: string;
    formula: string;
    sources: KPISourceContribution[];  // Which files contribute
    joins: KPIJoin[];                   // How they're connected
    aggregations: KPIAggregation[];     // SUM, AVG, COUNT, etc.
    explanation: string;                // Human-readable
}
```

## API Endpoints

### `GET /api/projects/[id]/data-lineage`

Returns existing data lineage for a project.

**Response:**
```json
{
  "projectId": "...",
  "status": "READY",
  "entityGraph": {
    "nodes": [...],
    "edges": [...]
  },
  "kpiLineages": [
    {
      "kpiName": "Total Revenue",
      "explanation": "Calculated by summing 'order_value' from orders.csv",
      "sources": ["orders.csv"]
    }
  ]
}
```

### `POST /api/projects/[id]/data-lineage`

Generates or regenerates data lineage.

**Response:**
```json
{
  "success": true,
  "summary": {
    "entityNodes": 4,
    "entityEdges": 3,
    "kpiLineagesTraced": 8
  },
  "message": "Generated lineage: 4 entities, 3 relationships, 8 KPI traces"
}
```

### `GET /api/projects/[id]/entity-graph`

Returns visualization-ready graph data.

**Response:**
```json
{
  "graph": {
    "nodes": [
      { "id": "...", "label": "orders", "type": "orders" }
    ],
    "edges": [
      { "source": "...", "target": "...", "label": "customer_id → id" }
    ]
  },
  "stats": {
    "totalNodes": 4,
    "totalEdges": 3,
    "entityTypes": ["customers", "orders", "products"]
  }
}
```

## Example Lineage Explanation

For a KPI "Average Order Value" with formula `SUM(order_value) / COUNT(order_id)`:

```
Calculated by summing 'order_value' from orders and counting 'order_id' from orders.
Formula: SUM(order_value) / COUNT(order_id).
```

## Files Created

| File | Purpose |
|------|---------|
| `lib/data-lineage/relationship-graph.ts` | Entity graph builder |
| `lib/data-lineage/kpi-lineage.ts` | KPI data flow tracer |
| `lib/data-lineage/index.ts` | Orchestrator and exports |
| `api/projects/[id]/data-lineage/route.ts` | Lineage API |
| `api/projects/[id]/entity-graph/route.ts` | Graph visualization API |

## Types Added to `prisma.ts`

- `EntityNode`, `EntityEdge`, `EntityRelationshipGraph`
- `KPISourceContribution`, `KPIJoin`, `KPIAggregation`
- `KPILineage`, `DataLineage`
- `ForeignKeyCandidate`

## Completion Criteria

✅ Entity relationship graph built from multiple data sources  
✅ Primary and foreign key candidates detected  
✅ KPI lineage traces source → formula → result  
✅ Human-readable explanations generated  
✅ API endpoints for lineage retrieval  
✅ Visualization-ready graph format  
✅ Integrated with existing KPI blueprint system  
