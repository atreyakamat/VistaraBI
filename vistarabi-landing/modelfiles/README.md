# VistaraBI Modelfiles Strategy

This directory contains `Modelfile` definitions for Ollama — one per AI task in the VistaraBI platform.
Using dedicated Modelfiles lets us:
- Tune `temperature` per task (low for analytics, higher for creative strategy)
- Embed task-specific `SYSTEM` prompts in the model itself (reducing prompt overhead per request)
- Version-control the model personality alongside the application

---

## Models Overview

| File | Task | Base Model | Temperature |
|------|------|-----------|-------------|
| `Modelfile.analytics` | Module 6 — KPI Q&A, SQL reasoning, correlations | qwen3:0.6b | 0.1 |
| `Modelfile.strategy` | Module 7 — Goal decomposition, action generation | qwen3:0.6b | 0.5 |
| `Modelfile.report` | Module 9 — Executive report summarization | qwen3:0.6b | 0.3 |

---

## Quick Setup

```bash
# Pull base model
ollama pull qwen3:0.6b

# Create specialized models
ollama create vistara-analytics -f modelfiles/Modelfile.analytics
ollama create vistara-strategy  -f modelfiles/Modelfile.strategy
ollama create vistara-report    -f modelfiles/Modelfile.report

# Verify
ollama list
```

---

## Usage in Code

The Modelfiles strategy is backward-compatible.
The `OLLAMA_MODEL` env var acts as the fallback for all tasks.
To activate the specialized models, set per-task env vars:

```env
OLLAMA_MODEL_ANALYTICS=vistara-analytics
OLLAMA_MODEL_STRATEGY=vistara-strategy
OLLAMA_MODEL_REPORT=vistara-report
OLLAMA_MODEL=qwen3:0.6b   # Fallback for all tasks
```

If the specialized env vars are not set, the system falls back to `OLLAMA_MODEL`.
