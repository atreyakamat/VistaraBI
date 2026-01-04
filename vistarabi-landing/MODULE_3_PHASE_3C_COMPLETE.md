# Module 3 Phase 3C: AI Semantic Domain Reasoning Layer ✅

## 🧠 Overview

Phase 3C transforms VistaraBI from a rule-based classifier into a **hybrid symbolic-neural Business Understanding Engine**. This layer uses a locally hosted Ollama model (qwen3:0.6b) to provide:

- **Semantic understanding** of column names and data patterns
- **Explainable AI reasoning** for domain classification
- **Guided decision support** when automation is uncertain
- **Confidence boosting** by fusing AI insights with rule-based detection

---

## 📦 What Was Built

### 1. Ollama Client (`src/lib/ai/ollama-client.ts`)
- **Health check** - Verify Ollama service availability
- **Model listing** - Get available local models
- **Chat completion** - Generate responses with structured prompts
- **Domain reasoning prompt** - Specialized prompt engineering for business classification
- **Response parsing** - Extract structured JSON from AI responses

### 2. AI Domain Reasoning Engine (`src/lib/ai/domain-reasoning.ts`)
- **`performAIDomainReasoning()`** - Main semantic analysis function
- **`getAIDomainReasoning()`** - Retrieve existing AI analysis
- **`shouldInvokeAIReasoning()`** - Decision logic for when to invoke AI
- **`getEnhancedDomainClassification()`** - Fuse Phase 3A + 3C for best result
- **`fuseConfidence()`** - Weighted combination (60% rule-based, 40% AI)

### 3. Database Model (`src/lib/prisma.ts`)
```typescript
interface AIDomainReasoning {
    id: string;
    projectId: string;
    primaryDomain: DomainType | null;
    primaryConfidence: number;
    secondaryDomain: DomainType | null;
    secondaryConfidence: number;
    reasoning: string;           // Human-readable explanation
    keySignals: string[];        // Detected business signals
    phase3AConfidence: number;   // Original rule-based confidence
    fusedConfidence: number;     // Combined AI + rule-based
    ollamaModel: string;         // Model used (qwen3:0.6b)
    processingTimeMs: number;
    createdAt: Date;
}
```

### 4. Backend API (`src/app/api/projects/[id]/ai-reasoning/route.ts`)
- **GET** - Retrieve existing AI reasoning and enhanced classification
- **POST** - Trigger new AI analysis

### 5. Frontend Component (`src/components/app/AIGuidedSelection.tsx`)
- Beautiful modal with Ollama status indicator
- Phase 3A detection display
- AI analysis trigger button
- Loading state with brain animation
- Error handling with Ollama setup instructions
- Primary and secondary domain suggestions
- AI reasoning explanation
- Key signals visualization
- Processing time display

---

## 🔄 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Domain Intelligence                       │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Phase 3A    │  Phase 3B    │  Phase 3C    │   Output       │
│  Detection   │  Governance  │  AI Reasoning │                │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ Keywords     │ Versioning   │ Ollama LLM   │ Governed       │
│ Patterns     │ Audit Trail  │ Semantic     │ Domain         │
│ Confidence   │ Lock/Unlock  │ Explainable  │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                      │              │
                      └──────┬───────┘
                             ▼
                    ┌─────────────────┐
                    │ Fused Confidence│
                    │ 60% Rules +     │
                    │ 40% AI          │
                    └─────────────────┘
```

---

## 🎯 How It Works

### Step 1: Data Gathering
```typescript
// Collects from all project sources:
- Column names (original)
- Normalized column names (lowercase, no special chars)
- Sample values from first 5 rows
- Row counts and source counts
```

### Step 2: Prompt Engineering
```typescript
// System prompt defines:
- 8 available business domains
- Expected JSON response format
- Focus on precision

// User prompt includes:
- Project name
- Column names (up to 30)
- Normalized names (up to 30)
- Sample values (up to 10 columns)
```

### Step 3: AI Response
```json
{
  "primary_domain": "ECOMMERCE",
  "confidence": 85,
  "secondary_domain": "RETAIL",
  "secondary_confidence": 45,
  "reasoning": "The data contains order_id, product, customer_id columns...",
  "key_signals": ["order_id", "product", "cart"]
}
```

### Step 4: Confidence Fusion
```typescript
fusedConfidence = (phase3A * 0.6) + (aiConfidence * 0.4)
```

---

## 🧪 Testing Guide

### Prerequisites
1. **Install Ollama**: https://ollama.ai
2. **Start Ollama service**: `ollama serve`
3. **Pull model**: `ollama pull qwen3:0.6b`

### Test Flow
1. Navigate to `http://localhost:3000`
2. Create/open a project
3. Upload a CSV file with business data
4. Click **"🧠 AI Assist"** button in header
5. Click **"✨ Analyze with AI"**
6. See AI suggestions with explanations
7. Click to select suggested domain

### API Testing
```javascript
// Trigger AI analysis
fetch('/api/projects/PROJECT_ID/ai-reasoning', {
  method: 'POST'
}).then(r => r.json()).then(console.log)

// Get AI reasoning
fetch('/api/projects/PROJECT_ID/ai-reasoning')
  .then(r => r.json()).then(console.log)
```

---

## 🎨 UI Features

### Header Buttons (when sources exist)
- **Domain Badge** - Current domain with confidence
- **🔍 Detect** - Manual rule-based detection
- **Select Domain** - Manual domain selection with KPIs
- **🧠 AI Assist** - AI-powered semantic analysis

### AI Guided Selection Modal
- Purple/cyan gradient branding
- Ollama connection status
- Phase 3A comparison
- AI suggestions with confidence bars
- Explainable reasoning
- Key business signals
- Processing time metrics

---

## 🔧 Configuration

### Environment Variables (optional)
```env
OLLAMA_URL=http://localhost:11434    # Ollama API endpoint
OLLAMA_MODEL=qwen3:0.6b              # Model to use
```

### Supported Models
- **qwen3:0.6b** (default) - Fast, lightweight, good for classification
- **llama3:8b** - Better reasoning, slower
- **mistral:7b** - Balanced performance

---

## 📊 Integration Points

### With Phase 3A (Rule-Based)
- AI is invoked when Phase 3A confidence < 70%
- AI can boost confidence when domains match
- AI provides alternative suggestions

### With Phase 3B (Governance)
- AI suggestions go through governance layer
- Manual AI selections are tracked in history
- Lock prevents AI from overriding

### With Modules 4-9 (Downstream)
- Downstream modules use `getGovernedDomain()`
- AI reasoning available for explainability
- Key signals available for KPI matching

---

## ✅ Completion Checklist

- [x] Ollama client with health checks
- [x] Domain reasoning prompt engineering
- [x] Response parsing and validation
- [x] Confidence fusion algorithm
- [x] Database model and CRUD
- [x] Backend API endpoints
- [x] Frontend AI guided selection
- [x] Error handling for offline Ollama
- [x] Setup instructions in UI
- [x] Integration with project workspace
- [x] TypeScript compilation passes

---

## 🚀 What This Enables

### For Users
- **Guided decisions** when unsure about domain
- **Explainable AI** reasoning in natural language
- **Key signal detection** showing what AI found
- **Confidence indicators** for informed choices

### For the System
- **Hybrid intelligence** (symbolic + neural)
- **Fallback support** when Ollama unavailable
- **Academic transparency** - explainable reasoning
- **Enterprise-grade audit** - all AI decisions logged

---

## 📝 Summary

**Module 3 Phase 3C is COMPLETE!**

VistaraBI now has a **semantic AI brain** that understands business data:

| Feature | Status |
|---------|--------|
| Ollama Integration | ✅ |
| Semantic Reasoning | ✅ |
| Explainable AI | ✅ |
| Confidence Fusion | ✅ |
| Guided Selection UI | ✅ |
| Error Handling | ✅ |
| TypeScript | ✅ |

The platform is now a **Hybrid Symbolic-Neural Business Understanding Engine** — research-grade foundation for intelligent analytics! 🎓🧠

---

## 🎯 Next Steps

With Module 3 complete (Phases 3A + 3B + 3C), the foundation is ready for:

1. **Module 4**: Domain-specific KPI calculation engine
2. **Module 5**: Trend analysis and forecasting
3. **Module 6**: AI chatbot with domain context
4. **Module 7**: Automated report generation
5. **Module 8**: Anomaly detection
6. **Module 9**: Recommendation engine

All downstream modules will benefit from **governed, AI-enhanced domain classification**! 🚀
