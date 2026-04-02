# VistaraBI Dataset Ingestion & Model Fine-Tuning Workflow

This document outlines how to use the automated ingestion system to keep your VistaraBI platform up-to-date with new data and ensure the AI models maintain a professional **Business Analyst** persona.

## 📁 Step 1: Uploading Datasets
- Place your new CSV files into the `vistarabi-landing/datasets/` directory.
- For best results, name the files according to the domain they belong to (e.g., `ecommerce_sales.csv`, `saas_churn.csv`).
- The system will scan this folder during ingestion.

---

## 🚀 Step 2: Running the Ingestion CLI
Run the master script to process data, update KPI blueprints, and fine-tune your local Ollama models.

```bash
cd vistarabi-landing
npx tsx scripts/ingest-and-tune.ts
```

### What happens during this step:
1. **Schema Extraction**: The system reads the headers of your new datasets.
2. **Business Analyst Tuning**: The `Modelfile.analytics.[domain]` files are updated with a specialized persona prompt derived from your real data.
3. **Model Refresh**: `ollama create` is called to register the latest intelligence for each domain.
4. **Coder Registration**: A new model, `vistara-coder`, is registered for UI/Card generation tasks.

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

---

## 🛠 Advanced: Customizing the Persona
If you want to change the "Business Analyst" behavior, you can modify the `tuneDomainWithPersona` function in `scripts/ingest-and-tune.ts` and re-run the script.
