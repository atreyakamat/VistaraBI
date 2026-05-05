# VistaraBI AI System Quick Reference

## 🚀 Quick Start

### 1. Minimum Setup (Local Only)

```bash
# Pull lightweight models
ollama pull qwen3.5:0.8b
ollama pull qwen2.5-coder:1.5b

# Configure .env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:0.8b
```

### 2. Recommended Setup (With Cloud Fallback)

Add to `.env`:
```bash
# Primary: Local Ollama (Fast, Private)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:0.8b

# Secondary: Cloud Provider (For complex reasoning)
CLOUD_AI_API_KEY=your-api-key
CLOUD_AI_BASE_URL=https://api.your-provider.com
CLOUD_AI_MODEL=qwen/qwen-2.5-72b-instruct
```

## 🤖 Agent Roles & Personas

The system dynamically routes your query to the best specialized agent:

| Agent | Use For | Example |
|-------|---------|---------|
| `business-analyst` | Strategic insights, KPIs | "Analyze our E-commerce churn" |
| `data-engineer` | Schema, Quality, ETL | "Map these columns to revenue" |
| `domain-expert` | Classification, Context | "Is this healthcare or retail data?" |
| `statistician` | Forecasting, Correlation | "Predict revenue for next quarter" |
| `narrative-writer` | Executive Summaries | "Summarize this for the board" |
| `strategy-planner` | Action plans, Goals | "How do we hit 15% growth?" |
| `quality-auditor` | Outliers, Anomalies | "Find errors in this dataset" |
| `kpi-designer` | Metric formulation | "What is the best formula for OEE?" |
| `general` | Generic assistance | "What can this dashboard do?" |

## 💻 Developer API

### Unified Generation (With Fallback)

```typescript
import { generateWithFallback } from '@/lib/ai/unified-ai-client';

const response = await generateWithFallback({
  messages: [{ role: 'user', content: 'Predict our MRR growth.' }],
  agentRole: 'statistician',
  temperature: 0.1
});

console.log(response.content); // Forecast logic
```

### Domain-Aware Routing

```typescript
import { getDomainModel } from '@/lib/ai/ollama-client';

// Automatically picks 'vistara-analytics-retail' if tuned
const model = getDomainModel('RETAIL'); 
```

## 🔍 Intelligence Maintenance

### 1. Re-Fine-Tune Models
Whenever you upload new datasets to `/datasets/[domain]`, refresh the AI's "Retail Truth":
```bash
npx tsx scripts/ingest-and-tune.ts RETAIL
```

### 2. Verify AI Health
```bash
curl http://localhost:3000/api/v1/ai/health
```

## 🧪 Testing

| Command | Purpose |
|---------|---------|
| `npm test` | Runs core deterministic logic |
| `npm run test:8` | Verifies Prophet forecasting bridge |
| `npm run test:9` | Verifies PDF report generation |
| `npm run test:ci` | Full suite (Requires active Ollama) |

---
*Last Updated: April 14, 2026*
