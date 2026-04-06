# 🧠 VistaraBI Intelligence System Manual

This manual provides instructions for operating the VistaraBI Domain Fine-Tuning and Dataset Ingestion pipeline. This system ensures that your local AI (Ollama) acts as a **Senior Business Analyst** perfectly aligned with your specific data schemas across all 8 supported domains: ECOMMERCE, SAAS, EDTECH, RETAIL, SERVICES, MANUFACTURING, HEALTHCARE, and FINANCE.

---

## 🛠 Prerequisites & Hardware Requirements

Before running the pipeline, ensure you have the following:

1.  **Node.js v20+** installed.
2.  **Ollama** installed and running (`ollama serve`).
3.  **Base Models Pulled**:
    ```bash
    ollama pull qwen3.5:0.8b
    ollama pull qwen2.5-coder:1.5b
    ```

**Memory / Hardware Recommendations:**
- **Minimum RAM**: 8GB. With the `qwen3.5:0.8b` analytics models and the `qwen2.5-coder:1.5b` coder model, **8GB of RAM** is now fully sufficient to run all VistaraBI intelligence features comfortably.
- **VRAM (GPU)**: A dedicated GPU is *optional* but recommended for faster inference. Any GPU with 2GB+ VRAM will comfortably run these lightweight models. 

---

## 🚀 The 3-Step Workflow

### 1. Data Preparation
Place your raw or cleaned CSV datasets into the domain-specific subdirectories inside the `datasets/` directory at the root of the project. The system will automatically create these folders if they don't exist:
*   `datasets/ecommerce/`
*   `datasets/saas/`
*   `datasets/retail/`
*   `datasets/services/`
*   `datasets/manufacturing/`
*   `datasets/healthcare/`
*   `datasets/finance/`
*   `datasets/edtech/`

*Note: For testing purposes, generic synthetic datasets using Indian business contexts have already been scaffolded in `dummy-data/clean/` which act as a fallback.*

### 2. Ingestion & Fine-Tuning
Run the master ingestion script. This script scans your data, extracts the schema (headers/samples), generates a professional **Business Analyst** persona via AI, and registers specialized models in Ollama.

**To fine-tune ALL domains at once:**
```bash
cd vistarabi-landing
npx tsx scripts/ingest-and-tune.ts
```

**To fine-tune ONE domain at a time (Recommended for lower memory systems):**
```bash
cd vistarabi-landing
npx tsx scripts/ingest-and-tune.ts RETAIL
```
*(Replace `RETAIL` with your target domain. This will only read datasets from `datasets/retail/` and update `vistara-analytics-retail`.)*

**What this does:**
*   Generates/Updates `modelfiles/Modelfile.analytics.[domain]`.
*   Registers models like `vistara-analytics-ecommerce`, `vistara-analytics-saas`, etc.
*   Registers `vistara-coder` for UI/Card generation tasks (only during a full run).

### 3. Validation (Global Data Brain)
Use the Data Brain CLI to verify that the AI "sees" all your data and can reason across domains.

```bash
npx tsx scripts/data-brain.ts "Which domains have columns related to profit or revenue?"
```

---

## 🤖 Model Personas & Usage

| Model Name | Primary Persona | Best Use Case |
| :--- | :--- | :--- |
| **`vistara-analytics-[domain]`** | **Senior Business Analyst** | Deep-dive analysis of domain-specific CSVs (e.g., SaaS churn, Retail sales). |
| **`vistara-coder`** | **UI Architect / Coder** | Generating React components, Tailwind layouts, and Framer Motion animations. |
| **`vistara-analytics`** | **Chief of Staff (Chanakya)** | High-level cross-domain strategy and architectural oversight. |

---

## 📂 Key Directories

*   `/datasets/[domain]`: Your landing zone for new CSV files, separated by domain.
*   `/modelfiles`: The source definitions for all Ollama models.
*   `/scripts`: The automation engine (`ingest-and-tune.ts`, `data-brain.ts`).
*   `/dummy-data/clean`: The "Ground Truth" fallback data used for persona generation.
*   `DOMAIN_KPI_BLUEPRINTS.json`: The generated map of all KPIs, formulas, and aliases.

---

## 🛠 Troubleshooting

**Q: The script fails to create a model or says "Connection Refused".**
*   Ensure Ollama is running (`ollama serve` in a separate terminal).
*   Check if you have enough disk space (each specialized model takes ~1-2GB).

**Q: The AI persona is too wordy.**
*   Edit the `prompt` in `scripts/ingest-and-tune.ts` to include a stricter constraint (e.g., "Max 1 sentence").
*   Re-run the ingestion script.

**Q: My data columns aren't being recognized.**
*   Ensure your CSV has a clear header row.
*   Check `src/lib/kpi/semantic-column-aliases.ts` to see if your column name needs a new alias mapping.

---
*Last Updated: April 2026*
