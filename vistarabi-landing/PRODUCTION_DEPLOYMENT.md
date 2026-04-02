# VistaraBI Production Deployment Guide

## 🚀 Overview

This guide covers deploying VistaraBI to production with a robust AI fallback chain and agent-based reasoning system.

## 📋 Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL database
- At least one AI provider:
  - **Local Ollama** (recommended for privacy)
  - **Cloud Ollama** (backup)
  - **OpenRouter** (final fallback for Claude/GPT-4)

## 🔧 Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/vistarabi

# Authentication (generate secure secrets in production)
JWT_SECRET=<your-secure-jwt-secret-32-chars-min>
NEXTAUTH_SECRET=<your-secure-nextauth-secret-32-chars-min>

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### AI Provider Configuration

#### Option 1: Local Ollama Only (Privacy-First)

```bash
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:2b
```

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull qwen3.5:2b

# Start Ollama service
ollama serve
```

#### Option 2: Local + Cloud Ollama (Recommended)

```bash
# Primary: Local Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:2b

# Fallback: Cloud Ollama
OLLAMA_CLOUD_URL=https://your-ollama-cloud-instance.com
OLLAMA_CLOUD_API_KEY=your-api-key
OLLAMA_CLOUD_MODEL=qwen3.5:397b
```

#### Option 3: Full Fallback Chain (Production)

```bash
# Primary: Local Ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:2b

# Secondary: Cloud Ollama
OLLAMA_CLOUD_URL=https://your-ollama-cloud-instance.com
OLLAMA_CLOUD_API_KEY=your-api-key
OLLAMA_CLOUD_MODEL=qwen3.5:397b

# Final Fallback: OpenRouter (Claude/GPT-4)
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

**Get OpenRouter API Key:** https://openrouter.ai/

## 🏗️ Build and Deploy

### 1. Install Dependencies

```bash
cd vistarabi-landing
npm install
```

### 2. Set Up Database

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Production Server

```bash
npm run start
```

The application will be available at the configured `NEXT_PUBLIC_APP_URL`.

## 🔍 Health Checks

### AI Provider Health

Check AI provider status:

```bash
curl https://your-domain.com/api/v1/ai/health
```

Expected response:
```json
{
  "status": "healthy",
  "providers": {
    "configured": 3,
    "available": ["ollama-local", "ollama-cloud", "openrouter"],
    "unavailable": []
  },
  "timestamp": "2026-03-26T10:00:00.000Z"
}
```

### Test AI Generation

Test with different agent roles:

```bash
curl -X POST https://your-domain.com/api/v1/ai/test \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the key metrics for a SaaS business?",
    "agentRole": "business-analyst",
    "temperature": 0.2
  }'
```

## 🤖 Agent Role System

VistaraBI uses specialized AI agents for different tasks:

| Agent Role | Use Case |
|------------|----------|
| **business-analyst** | Business insights, KPI interpretation, strategic reasoning |
| **data-engineer** | Data quality, transformations, ETL processes |
| **domain-expert** | Business domain classification, industry context |
| **statistician** | Statistical analysis, correlations, forecasting |
| **narrative-writer** | Event explanations, data storytelling |
| **strategy-planner** | Goal setting, action planning, prescriptive analytics |
| **quality-auditor** | Data quality assessment, validation |
| **kpi-designer** | KPI formulation, metric design |
| **general** | General-purpose reasoning |

## 🧪 Testing

### Run Full Test Suite

```bash
# All tests
npm test

# Module-specific tests
npm run test:1-2    # Modules 1-2
npm run test:3      # Module 3
npm run test:4d     # Module 4
npm run test:5a     # Module 5
npm run test:6      # Module 6
npm run test:7      # Module 7
npm run test:9      # Module 9

# End-to-end integration test
npm test tests/e2e-all-modules.test.ts
```

### Manual Validation

Test the complete pipeline:

1. **Upload Data** → Module 1
2. **View Quality Report** → Module 2
3. **Check Domain Classification** → Module 3
4. **Review KPIs** → Module 4
5. **View Dashboard** → Module 5
6. **Ask Natural Language Questions** → Module 6
7. **Set Goals** → Module 7
8. **View Forecasts** → Module 8
9. **Get Strategic Insights** → Module 9

## 🔒 Security Considerations

### 1. Secure Secrets

Never commit secrets to version control:

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Rate Limiting

VistaraBI includes built-in rate limiting:
- General API: 100 requests per 15 minutes
- AI endpoints: 20 requests per 15 minutes
- Upload endpoints: 10 requests per 15 minutes

### 3. API Key Protection

Store API keys securely:
- Use environment variables
- Never log API keys
- Rotate keys regularly

### 4. Database Security

- Use SSL connections in production
- Apply principle of least privilege
- Regular backups

## 📊 Monitoring

### Application Logs

Monitor AI provider usage:

```bash
# Check logs for AI fallback behavior
grep "AI" /var/log/vistarabi/app.log

# Monitor provider failures
grep "Failed with" /var/log/vistarabi/app.log
```

### Key Metrics to Track

- AI provider response times
- Fallback chain activations
- Error rates per module
- Token usage (for cloud providers)
- User query patterns

## 🔄 Fallback Chain Behavior

The system tries providers in this order:

1. **Ollama (local)** - Fast, private, no API costs
   - Timeout: 30s
   - Best for: Quick operations, privacy-sensitive data

2. **Ollama (cloud)** - Larger model, more capable
   - Timeout: 120s
   - Best for: Complex reasoning, when local fails

3. **OpenRouter (Claude/GPT-4)** - Most capable, final fallback
   - Timeout: 120s
   - Best for: When all else fails, complex synthesis

**Automatic Behavior:**
- If provider 1 fails → Try provider 2
- If provider 2 fails → Try provider 3
- If all fail → Return error to user

## 🛠️ Troubleshooting

### Issue: No AI providers available

**Check:**
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check environment variables
echo $OLLAMA_URL
echo $OLLAMA_CLOUD_URL
echo $OPENROUTER_API_KEY
```

### Issue: Slow AI responses

**Solutions:**
- Use smaller local model (qwen3.5:2b instead of larger models)
- Increase timeout values
- Add cloud fallback for better redundancy

### Issue: High token costs

**Solutions:**
- Ensure local Ollama is working (no API costs)
- Monitor OpenRouter usage dashboard
- Set up alerts for high usage

## 📈 Scaling Considerations

### Horizontal Scaling

VistaraBI is stateless and can be scaled horizontally:

```bash
# Run multiple instances behind a load balancer
npm run start # Instance 1 on port 3000
npm run start # Instance 2 on port 3001
# ... etc
```

### Database Connection Pooling

Adjust Prisma connection pool:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"
```

### AI Provider Scaling

- **Local Ollama**: Consider GPU instances for better performance
- **Cloud Ollama**: Use managed Ollama services that auto-scale
- **OpenRouter**: Has built-in rate limiting and scaling

## 🆘 Support and Documentation

- **Main Documentation**: `/vistarabi-landing/GEMINI.md`
- **Module Status**: `/vistarabi-landing/MODULE_IMPLEMENTATION_STATUS.md`
- **Architecture**: `/vistarabi-landing/MODULE_*_ARCHITECTURE.md`
- **API Documentation**: Each module's README in `/src/lib/module-*/`

## 🎯 Production Checklist

- [ ] All environment variables configured
- [ ] At least one AI provider working
- [ ] Database migrations applied
- [ ] Secure secrets generated
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting enabled
- [ ] Monitoring and logging set up
- [ ] Backups configured
- [ ] Health checks passing
- [ ] Full test suite passing
- [ ] Load testing completed
- [ ] Security audit completed

## 🔄 Maintenance

### Regular Tasks

- **Daily**: Check health endpoints, review error logs
- **Weekly**: Review AI provider usage and costs
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Audit security configuration, review capacity

### Updates

```bash
# Update dependencies
npm update

# Rebuild
npm run build

# Restart
npm run start
```

---

**Last Updated**: March 2026
**Version**: 1.0.0
