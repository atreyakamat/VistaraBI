# Module 4 Phase 4C: AI KPI Discovery & Innovation Engine

## Overview

Module 4C is the **AI KPI Discovery & Innovation Engine** - a semantic intelligence layer that extends the standard KPI Intelligence Engine by **inventing meaningful, domain-relevant business KPIs** that are not explicitly defined in any hardcoded KPI library.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  AI KPI Discovery Engine                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │  Unmatched      │    │   Derived KPI   │    │    Ollama   │ │
│  │  Columns        │───▶│   Library       │───▶│  Invention  │ │
│  │  Analysis       │    │   Matching      │    │   Engine    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI KPI Proposal Registry                   │   │
│  │  • Invented KPIs (from Ollama)                         │   │
│  │  • Library-Derived KPIs (predefined formulas)          │   │
│  │  • Status: PENDING | APPROVED | REJECTED               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              KPI Blueprint (Module 4B)                  │   │
│  │  User reviews, approves, or rejects proposals          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Derived KPI Library (`derived-kpi-library.ts`)

Pre-defined derived KPIs that depend on **other KPIs** (not raw columns):

| Domain | Examples |
|--------|----------|
| **GLOBAL** | Revenue Efficiency, Profit Margin %, Customer Value Index |
| **ECOMMERCE** | Revenue per Visitor, Discount Dependency Ratio |
| **SAAS** | LTV to CAC Ratio, Revenue Stability Score, CAC Payback |
| **SERVICES** | Revenue per Employee, Client Risk Index |
| **MANUFACTURING** | Production Efficiency Score, Waste Cost Impact |
| **FINANCE** | Financial Health Index, Risk Adjusted Return |

### 2. AI KPI Discovery Engine (`ai-kpi-discovery.ts`)

- **Gathers context** from unmatched columns and sample values
- **Matches derived KPIs** from library based on existing blueprint
- **Invents new KPIs** using Ollama when columns aren't matched
- **Stores proposals** in the registry for user review

### 3. AI KPI Proposal Interface

```typescript
interface AIKPIProposal {
    id: string;
    projectId: string;
    kpiName: string;
    description: string;
    formula: string;
    category: string;
    contributingColumns: string[];
    derivedFrom: string[];  // Other KPI IDs
    isDerived: boolean;
    businessMeaning: string;
    whyItMatters: string;
    confidenceScore: number;
    domain: DomainType;
    sourceType: 'AI_INVENTED' | 'LIBRARY_DERIVED' | 'AI_DERIVED';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
}
```

## API Endpoints

### `GET /api/projects/[id]/ai-kpi-discovery`

Retrieves all AI KPI proposals for a project.

**Response:**
```json
{
  "proposals": [...],
  "count": 8,
  "summary": {
    "invented": 3,
    "derived": 5,
    "pending": 6,
    "approved": 2
  }
}
```

### `POST /api/projects/[id]/ai-kpi-discovery`

Triggers AI KPI discovery process.

**Response:**
```json
{
  "success": true,
  "proposals": [...],
  "inventedCount": 3,
  "derivedCount": 5,
  "message": "Discovered 8 AI KPI proposals"
}
```

### `PATCH /api/projects/[id]/ai-kpi-discovery`

Updates a proposal's status (approve/reject).

**Body:**
```json
{
  "proposalId": "ai-inv-123",
  "status": "APPROVED"
}
```

## Derived KPI Design Rules

| Rule | Description |
|------|-------------|
| ❌ No raw columns | Derived KPIs don't directly use data columns |
| ✅ Depend on KPIs | They compute from existing KPI values |
| ✅ Post-resolution | Computed after base KPIs are calculated |
| ✅ Cross-domain | Global KPIs work across all domains |
| ✅ Optional | Only computed if dependencies exist |

## UI Integration

The KPI Workspace (`/app/projects/[id]/kpis`) shows three types of suggestions:

1. **📋 Your Data Columns** - Raw columns from uploaded files
2. **🔮 AI Suggestions** - AI-invented and library-derived KPIs
3. **✅ Blueprint** - User-approved KPIs

Each AI suggestion shows:
- ✨ **AI Invented** badge (from Ollama)
- 📚 **Library** badge (from derived KPI library)
- 💡 Business meaning explanation
- 📐 Formula expression
- 🏷️ Contributing columns

## Usage Flow

1. User uploads data → Module 1 parses
2. Domain selected → Module 3 finalizes
3. KPI discovery → Module 4A matches columns
4. **AI discovery → Module 4C invents KPIs**
5. User reviews → Approves/rejects in Module 4B
6. Blueprint locked → Ready for analytics

## Configuration

```env
# Ollama Model for KPI invention
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
```

## Example Invented KPI

For a dataset with columns `[orders, revenue, shipping_cost, returns]`:

```json
{
  "kpiName": "Net Revenue Efficiency",
  "formula": "(revenue - shipping_cost - returns) / orders",
  "category": "profitability",
  "businessMeaning": "Shows actual profit per order after costs",
  "whyItMatters": "Helps identify if shipping and return costs are eating into margins"
}
```

## Completion Criteria

✅ VistaraBI can invent meaningful KPIs from unused data columns
✅ AI KPIs are domain-appropriate and business-relevant
✅ Each KPI has formula, description, and business explanation
✅ Proposals integrate into governed approval workflow (Module 4B)
✅ Library of 30+ predefined derived KPIs across domains
✅ Full auditability of AI-generated suggestions
