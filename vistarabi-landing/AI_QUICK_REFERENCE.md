# VistaraBI AI System Quick Reference

## 🚀 Quick Start

### 1. Minimum Setup (Local Only)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull qwen3.5:2b

# Start Ollama
ollama serve

# Configure .env
echo "OLLAMA_URL=http://localhost:11434" >> .env
echo "OLLAMA_MODEL=qwen3.5:2b" >> .env
```

### 2. Recommended Setup (With Fallbacks)

Add to `.env`:
```bash
# Primary: Local Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:2b

# Secondary: Cloud Ollama (optional)
OLLAMA_CLOUD_URL=https://your-cloud-instance.com
OLLAMA_CLOUD_API_KEY=your-api-key
OLLAMA_CLOUD_MODEL=qwen3.5:397b

# Final Fallback: OpenRouter (optional)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

## 🤖 Agent Roles Quick Reference

| Agent | Use For | Example |
|-------|---------|---------|
| `business-analyst` | Strategic insights, business metrics | "What drives revenue growth?" |
| `data-engineer` | Data quality, ETL, transformations | "How to clean this dataset?" |
| `domain-expert` | Industry classification, context | "What industry is this data from?" |
| `statistician` | Statistical analysis, forecasting | "Explain this correlation" |
| `narrative-writer` | Stories, explanations, summaries | "Explain this trend to executives" |
| `strategy-planner` | Goals, roadmaps, action plans | "How to improve retention?" |
| `quality-auditor` | Data validation, quality checks | "Assess this data quality" |
| `kpi-designer` | Metric design, KPI formulation | "What KPIs should we track?" |
| `general` | General-purpose queries | "What is this data about?" |

## 💻 Code Examples

### Basic Usage

```typescript
import { generateWithFallback } from '@/lib/ai/unified-ai-client';

// Simple query
const response = await generateWithFallback({
  messages: [{
    role: 'user',
    content: 'What are the key metrics for SaaS businesses?'
  }],
  temperature: 0.2,
  agentRole: 'business-analyst',
});

console.log(response.content);  // AI response
console.log(response.provider); // "ollama-local" or "ollama-cloud" or "openrouter"
console.log(response.latencyMs); // Response time
```

### With Conversation History

```typescript
const response = await generateWithFallback({
  messages: [
    { role: 'system', content: 'You are a helpful data analyst.' },
    { role: 'user', content: 'What is MRR?' },
    { role: 'assistant', content: 'MRR is Monthly Recurring Revenue...' },
    { role: 'user', content: 'How do I calculate it?' },
  ],
  temperature: 0.2,
  agentRole: 'business-analyst',
});
```

### Module-Specific Usage

```typescript
// Module 3: Domain Classification
import { performSemanticReasoning } from '@/lib/ai/ollama-client';

const result = await performSemanticReasoning({
  projectName: 'Sales Data',
  matchedColumns: [...],
  // Uses 'domain-expert' agent automatically
});

// Module 4: KPI Generation
import { generateKPISuggestions } from '@/lib/ai/ollama-client';

const kpis = await generateKPISuggestions(
  columns,
  sampleRows,
  'E-COMMERCE'
  // Uses 'kpi-designer' agent automatically
);
```

## 🔍 Health Checks

### Check AI Provider Status

```bash
# Via API
curl http://localhost:3000/api/v1/ai/health

# Response
{
  "status": "healthy",
  "providers": {
    "configured": 3,
    "available": ["ollama-local", "openrouter"],
    "unavailable": ["ollama-cloud"]
  }
}
```

### Test AI Generation

```bash
curl -X POST http://localhost:3000/api/v1/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the most important metrics for an e-commerce business?",
    "agentRole": "business-analyst",
    "temperature": 0.2
  }'
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run E2E Integration Tests

```bash
npm test tests/e2e-all-modules.test.ts
```

### Run Module-Specific Tests

```bash
npm run test:3    # Domain classification
npm run test:4d   # KPI engine
npm run test:5a   # Analytics
npm run test:6    # AI command execution
npm run test:7    # Goal strategy
```

## 🛠️ Troubleshooting

### Issue: "No AI providers configured"

```bash
# Check .env file
cat .env | grep OLLAMA_URL

# Should output: OLLAMA_URL=http://localhost:11434
```

### Issue: "All AI providers failed"

```bash
# 1. Check if Ollama is running
curl http://localhost:11434/api/tags

# 2. Check if model is installed
ollama list

# 3. Check health endpoint
curl http://localhost:3000/api/v1/ai/health
```

### Issue: Slow responses

```bash
# Use faster model
echo "OLLAMA_MODEL=qwen3.5:2b" >> .env

# Or enable cloud fallback for complex queries
echo "OPENROUTER_API_KEY=your-key" >> .env
```

## 📊 Temperature Guide

| Temperature | Behavior | Use For |
|------------|----------|---------|
| 0.0 | Deterministic | KPIs, metrics, structured data |
| 0.1-0.2 | Very consistent | Domain classification, analysis |
| 0.3-0.4 | Balanced | General queries, explanations |
| 0.5-0.7 | Creative | Narratives, summaries |
| 0.8-1.0 | Very creative | Brainstorming (not recommended) |

## 🔒 Security Checklist

- [ ] Never commit `.env` to git
- [ ] Use unique secrets in production
- [ ] Rotate API keys regularly
- [ ] Use SSL/TLS in production
- [ ] Enable rate limiting
- [ ] Monitor token usage
- [ ] Review logs for suspicious activity

## 📈 Production Checklist

- [ ] At least 1 AI provider configured
- [ ] Health check returns 200
- [ ] All module tests pass
- [ ] Build completes successfully
- [ ] Database migrations applied
- [ ] Secure secrets configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place

## 🎯 Next Steps

1. **Development**:
   - Set up local Ollama
   - Run tests
   - Explore modules

2. **Staging**:
   - Add cloud fallback
   - Test with real data
   - Performance testing

3. **Production**:
   - Configure all 3 providers
   - Enable monitoring
   - Set up alerts
   - Review security

## 📚 Documentation

- **Full Guide**: `IMPLEMENTATION_SUMMARY.md`
- **Deployment**: `PRODUCTION_DEPLOYMENT.md`
- **Project Context**: `GEMINI.md`
- **Module Status**: `MODULE_IMPLEMENTATION_STATUS.md`

## 💡 Tips

1. **Start simple**: Begin with local Ollama only
2. **Add fallbacks gradually**: Add cloud providers as needed
3. **Monitor costs**: OpenRouter charges per token
4. **Use right agent**: Match agent to task for best results
5. **Test thoroughly**: Run full test suite before deploying
6. **Check logs**: Monitor which providers are being used
7. **Optimize models**: Use smaller models for simple tasks

## 🆘 Getting Help

1. Check `IMPLEMENTATION_SUMMARY.md` for detailed info
2. Review `PRODUCTION_DEPLOYMENT.md` for deployment issues
3. Run health checks to diagnose problems
4. Check logs for error messages
5. Test with `/api/v1/ai/test` endpoint

---

**Last Updated**: March 26, 2026
