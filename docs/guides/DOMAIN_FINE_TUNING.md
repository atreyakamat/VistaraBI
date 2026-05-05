# VistaraBI Domain Fine-Tuning Guide

This guide details the system we built to fine-tune VistaraBI for our 8 distinct business domains. The system ensures the AI pipeline dynamically shifts its vocabulary, reasoning, and metadata defaults based on the uploaded data.

---

## 🏗 The Architecture

We refactored the platform to be fully domain-aware across both the Rule-Based Metadata layer and the AI Reasoning layer.

1. **Domain Models**: We created 8 separate Ollama `Modelfiles` extending `qwen3:0.6b` with deep system prompts tailored to each domain's vocabulary and specific KPI measurement standards.
2. **Semantic Aliases**: A massive canonical mapping (`semantic-column-aliases.ts`) was created to safely map real-world messy dataset column headers to our formal `SemanticRoles`.
3. **KPI Engine**: Core blueprints and rules evaluate unlocked KPIs explicitly using the `evaluateEligibility()` deterministic engine.
4. **Dynamic AI Router**: `getDomainModel()` seamlessly shifts the Ollama query locally to use the correct registered model depending on the dataset context.

### 🌐 The 8 Supported Domains
- E-Commerce
- SaaS
- EdTech
- Retail
- Services
- Manufacturing
- Healthcare
- Finance

---

## 🛠 Using the Data Testing CLIs

To ensure users can immediately verify that datasets properly trigger the correct Modelfiles and KPI blueprints, we bundled two dedicated Testing CLIs into the system.

### 1. The Domain Pipeline Tester
This CLI automates the loop of uploading a CSV, grabbing its structure, checking KPI eligibility, and requesting AI insights — all locally.

**How to use:**
1. Drop your sample `.csv` datasets into `vistarabi-landing/dummy-data/clean/[domain]/`.
2. Run the test script to push them through the entire processing pipeline:
   ```bash
   cd vistarabi-landing
   npx tsx scripts/test-domain-pipeline.ts
   ```
3. **What it does:** It runs Semantic Mapping to log column aliases, evaluates the KPI rules checking if the CSV unlocks formal KPI Blueprints, and triggers the configured Ollama Modelfile to generate test responses based only on the dataset's column attributes.

### 2. The Global AI Data Package Manager 
The user requested a way to bundle all available datasets into a package for Ollama to observe globally. This CLI prepares the metadata package and performs cross-reasoning.

**How to use:**
```bash
npx tsx scripts/ai-data-cli.ts
```
1. This tool scans all available datasets and condenses them into a JSON package.
2. It sends this package to the `vistara-analytics` master model.
3. The LLM acts as an executive data architect, offering cross-domain data insights and strategic suggestions across all User uploads simultaneously.

---

## 🔧 Working with the Ollama Modelfiles

The Modelfiles sit in `vistarabi-landing/modelfiles/`. If you wish to change the system prompts or teach the AI about a new KPI parameter, you can edit the respective `Modelfile.analytics.[domain]` file.

**Re-registering modified models:**
```powershell
# Run the built-in deployment script (Windows PowerShell)
.\scripts\register-modelfiles.ps1 -Force
```
This script safely unloads and reloads the fine-tuned system prompts directly into your local Ollama runtime so the `ai/ollama-client.ts` router can immediately use them.
