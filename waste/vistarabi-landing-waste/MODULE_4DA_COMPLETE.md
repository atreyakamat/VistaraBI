# Module 4D-A: Data Relationship Modeling Engine

## Overview

Module 4D-A is the **Data Relationship Modeling Engine** - VistaraBI's internal data architect. It automatically discovers how datasets relate to each other through shared identifiers, building a structured **Relationship Registry** that enables cross-table KPI computation and explainable analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Data Relationship Modeling Engine                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐         ┌─────────────────────────────────┐│
│  │ Relationship    │         │       Confidence Scoring        ││
│  │   Detector      │────────▶│  • Name similarity (30%)        ││
│  │                 │         │  • Value overlap (30%)          ││
│  └─────────────────┘         │  • Uniqueness (25%)             ││
│          │                   │  • Data type (15%)              ││
│          ▼                   └─────────────────────────────────┘│
│  ┌─────────────────┐                       │                    │
│  │ AI Validator    │◀──────────────────────┘                    │
│  │ (Ollama)        │  If 0.4 < confidence < 0.7                 │
│  └─────────────────┘                                            │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Relationship Registry                           ││
│  │  RelationshipEntry[]: source → target with confidence       ││
│  └─────────────────────────────────────────────────────────────┘│
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  API: GET/POST /api/projects/[id]/relationship-registry     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Relationship Detector (`relationship-detector.ts`)

Multi-factor confidence scoring algorithm:

| Factor | Weight | Description |
|--------|--------|-------------|
| Name similarity | 30% | Normalized column name matching |
| Value overlap | 30% | FK values existing in PK column |
| Uniqueness | 25% | PK should be ~100% unique |
| Data type | 15% | Both columns same type |

### 2. AI Relationship Validator (`ai-relationship-validator.ts`)

Uses Ollama for ambiguous cases (40-70% confidence):
- Validates if columns represent same business entity
- Adjusts confidence based on semantic analysis
- Falls back gracefully if Ollama unavailable

### 3. Relationship Registry (`relationship-registry.ts`)

Orchestrates detection, validation, and storage:
- Builds registry from all project sources
- Stores explainable confidence factors
- Enables path-finding between sources

## Data Structures

### RelationshipEntry

```typescript
interface RelationshipEntry {
    sourceTableId: string;
    sourceTableName: string;
    sourceColumn: string;
    targetTableId: string;
    targetTableName: string;
    targetColumn: string;
    relationshipType: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'LOOKUP';
    joinCardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
    confidence: number;
    detectionMethod: DetectionMethod;
    confidenceFactors: ConfidenceFactors;
    explanation: string;
}
```

## API Endpoints

### `GET /api/projects/[id]/relationship-registry`

Returns the relationship registry with statistics.

**Response:**
```json
{
  "status": "READY",
  "relationships": [
    {
      "source": { "tableName": "orders", "column": "customer_id" },
      "target": { "tableName": "customers", "column": "customer_id" },
      "type": "FOREIGN_KEY",
      "confidence": 85,
      "confidenceFactors": {
        "nameSimilarity": 100,
        "valueOverlap": 92,
        "uniqueness": 100,
        "dataTypeMatch": 100
      }
    }
  ],
  "stats": {
    "totalRelationships": 4,
    "avgConfidence": 82
  }
}
```

### `POST /api/projects/[id]/relationship-registry`

Generates or regenerates the registry.

**Request Body:**
```json
{ "useAI": true }
```

## Files Created

| File | Purpose |
|------|---------|
| `lib/data-lineage/relationship-detector.ts` | Multi-factor scoring engine |
| `lib/data-lineage/ai-relationship-validator.ts` | Ollama AI validation |
| `lib/data-lineage/relationship-registry.ts` | Registry orchestrator |
| `api/projects/[id]/relationship-registry/route.ts` | API endpoint |

## Types Added to `prisma.ts`

- `ConfidenceFactors`, `RelationshipType`, `DetectionMethod`, `JoinCardinality`
- `AIValidationResult`, `RelationshipEntry`, `RelationshipRegistry`

## Confidence Thresholds

```
confidence >= 0.7  → AUTO_ACCEPT (high confidence)
0.4 <= confidence < 0.7 → AI_VALIDATE (if Ollama available)
confidence < 0.4  → REJECT (low confidence)
```

## Completion Criteria

✅ Relationship detection with multi-factor scoring  
✅ Primary/foreign key identification  
✅ Join cardinality analysis  
✅ Optional AI validation for ambiguous cases  
✅ Explainable confidence factors  
✅ Stored relationship registry per project  
✅ API endpoints for retrieval and generation  
