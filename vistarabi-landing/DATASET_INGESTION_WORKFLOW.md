# VistaraBI Dataset Ingestion & Model Fine-Tuning Workflow

This document outlines how to use the automated ingestion system to keep your VistaraBI platform up-to-date with new data and ensure the AI models maintain a professional **Business Analyst** persona.

## 📁 Step 1: Uploading Datasets
- Place your CSV files inside `vistarabi-landing/datasets/<domain>/`.
- Nested folders are supported (for example `datasets/retail/archive-1/...`); ingestion now scans recursively.
- For best results, keep filenames descriptive (e.g., `ecommerce_sales.csv`, `saas_churn.csv`).

---

## 🚀 Step 2: Running the Ingestion CLI
Run the master script to process data, update KPI blueprints, and fine-tune your local Ollama models.

```bash
cd vistarabi-landing
npx tsx scripts/ingest-and-tune.ts
```

### What happens during this step:
1. **Recursive Schema Extraction**: The system reads all CSV headers in the domain folder tree.
2. **Feature Catalog Generation**: It writes a machine-readable feature profile to `datasets/<domain>/<domain>-feature-catalog.json`.
3. **Business Analyst Tuning**: The `Modelfile.analytics.[domain]` files are regenerated with the active data catalog context.
4. **Model Refresh**: `ollama create` registers updated domain intelligence.
5. **Coder Registration**: On full runs, `vistara-coder` is refreshed for UI/Card generation tasks.

---

## 🤖 Step 3: Available Models
After running the script, you have the following specialized models available:

| Model Name | Purpose | Persona |
| :--- | :--- | :--- |
| `vistara-analytics-[domain]` | Strategic Data Interpretation | Senior Business Analyst |
| `vistara-coder` | React/Tailwind/Framer Code Generation | UI Architect / Coder |
| `vistara-analytics` | Global Cross-Domain Visibility | Chief of Staff (Chanakya) |

---

## 📊 Step 4: Verification
To verify that everything is working as expected, use the Data Brain CLI:

```bash
npx tsx scripts/data-brain.ts "List all available tables across my domains."
```

To inspect one domain deeply before tuning:

```bash
npx tsx scripts/profile-domain-datasets.ts RETAIL
```

---

## 🛠 Advanced: Customizing the Persona
If you want to change the "Business Analyst" behavior, you can modify the `tuneDomainWithPersona` function in `scripts/ingest-and-tune.ts` and re-run the script.
