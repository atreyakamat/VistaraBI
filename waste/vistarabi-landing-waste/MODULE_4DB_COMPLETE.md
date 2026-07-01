# Module 4D-B: KPI Lineage and Explainability Engine

## Overview

Module 4D-B is the **KPI Lineage and Explainability Engine** - VistaraBI's internal "metric historian." It makes every KPI traceable, transparent, and explainable from raw data to final metric, answering "How was this KPI calculated?"

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│            KPI Lineage and Explainability Engine                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────────────────────┐│
│  │ KPI Blueprint   │────────▶│    KPI Lineage Tracer           ││
│  │ (Module 4B/4C)  │         │  • Source identification        ││
│  └─────────────────┘         │  • Aggregation parsing          ││
│                              │  • Column mapping               ││
│  ┌─────────────────┐         └─────────────────────────────────┘│
│  │ Relationship    │                       │                    │
│  │ Registry (4D-A) │────────▶    Join Path Detection            │
│  └─────────────────┘                       │                    │
│                                            ▼                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Explanation Generator                           ││
│  │  • Technical explanation (formula-based)                    ││
│  │  • Business explanation (human-friendly)                    ││
│  │  • Optional AI enhancement (Ollama)                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              KPI Lineage Registry                            ││
│  │  KPILineageEntry[]: per-KPI traceability records            ││
│  └─────────────────────────────────────────────────────────────┘│
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  APIs: /kpi-lineage (full registry)                         ││
│  │        /kpis/[kpiId]/explain (single KPI explanation)       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Explanation Generator (`explanation-generator.ts`)

Generates dual explanations:

| Type | Purpose | Example |
|------|---------|---------|
| Technical | Formula-based | `SUM(order_amount) from orders. INNER JOIN on customer_id` |
| Business | Human-friendly | `Total Revenue measures the total of order amount from orders` |

### 2. KPI Lineage Registry (`kpi-lineage-registry.ts`)

Orchestrates lineage tracing for all KPIs:
- Integrates with 4D-A RelationshipRegistry for join paths
- Parses formulas for aggregations
- Maps columns to source tables
- Stores versioned registry with statistics

## Data Structures

### KPILineageEntry

```typescript
interface KPILineageEntry {
    kpiId: string;
    kpiName: string;
    domain: string;
    formula: string;
    category: string;
    sources: KPISourceContribution[];
    joinPaths: KPIJoinPath[];           // From 4D-A registry
    aggregations: KPIAggregation[];
    technicalExplanation: string;
    businessExplanation: string;
    aiEnhanced: boolean;
    confidence: number;
}
```

## API Endpoints

### `GET /api/projects/[id]/kpi-lineage`

Returns the full KPI lineage registry with stats.

### `POST /api/projects/[id]/kpi-lineage`

Generates lineage for all blueprint KPIs.

**Request:** `{ "useAI": true }`

### `GET /api/projects/[id]/kpis/[kpiId]/explain`

Answers "How is this KPI calculated?" for a single KPI.

**Response:**
```json
{
  "kpi": { "name": "Total Revenue", "formula": "SUM(order_amount)" },
  "howCalculated": {
    "summary": "Total Revenue measures the total of order amounts from your sales records.",
    "technical": "SUM(order_amount) from orders. Formula: SUM(order_amount)."
  },
  "dataSources": ["orders"],
  "dataJoins": [],
  "aggregations": [{ "function": "SUM", "column": "order_amount" }]
}
```

## Files Created

| File | Purpose |
|------|---------|
| `lib/data-lineage/explanation-generator.ts` | Template + AI explanations |
| `lib/data-lineage/kpi-lineage-registry.ts` | Registry orchestrator |
| `api/projects/[id]/kpi-lineage/route.ts` | Full registry endpoint |
| `api/projects/[id]/kpis/[kpiId]/explain/route.ts` | Single KPI explain |

## Types Added to `prisma.ts`

- `KPIJoinPath`, `KPILineageEntry`, `KPILineageRegistry`

## Completion Criteria

✅ Every blueprint KPI has a stored lineage record  
✅ System generates clear plain-language explanations  
✅ Technical and business explanations available  
✅ Join paths derived from 4D-A RelationshipRegistry  
✅ API endpoints for visualization and AI reasoning  
✅ Optional AI enhancement via Ollama  
