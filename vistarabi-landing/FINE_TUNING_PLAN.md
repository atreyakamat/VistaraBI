# VistaraBI Domain Fine-Tuning & KPI Optimization Plan

This document outlines the strategic plan to fine-tune the VistaraBI platform for 8 key business domains. The goal is to ensure that the AI engine (Ollama) and the KPI discovery layers are perfectly aligned with real-world data structures and business requirements.

## 🎯 Target Domains
1. **ECOMMERCE**: Online retail, marketplaces, and D2C.
2. **SAAS**: Software as a Service, subscriptions, and recurring revenue.
3. **EDTECH**: Education technology, student engagement, and learning platforms.
4. **RETAIL**: Physical retail, brick-and-mortar, and omni-channel.
5. **SERVICES**: Professional services, consulting, and project-based businesses.
6. **MANUFACTURING**: Production, quality control, and supply chain.
7. **HEALTHCARE**: Patient care, clinic management, and medical operations.
8. **FINANCE**: Banking, transactions, and financial risk management.

---

## 🛠 Phase 1: Modelfile Fine-Tuning (AI Alignment)

### Goal
Update the `SYSTEM` prompts in Ollama Modelfiles to include domain-specific vocabulary, critical KPI distinctions, and business logic constraints derived from actual dataset analysis.

### Implementation
- **Script**: `scripts/fine-tune-domains.ts`
- **Logic**:
    1. Scan `dummy-data/` for the latest CSV headers and column categories.
    2. Feed these attributes to a "Meta-AI" (Chanakya) to generate an optimized `SYSTEM` prompt.
    3. Update `modelfiles/Modelfile.analytics.[domain]` files.
    4. Automatically register/update models in local Ollama via `ollama create`.

---

## 📊 Phase 2: KPI Blueprint Optimization (Structural Alignment)

### Goal
Ensure that the `KPI_LIBRARY` in `src/lib/kpi/kpi-library.ts` and the semantic aliases in `semantic-column-aliases.ts` match the patterns found in user-provided datasets.

### Implementation
- **Logic**:
    1. Identify new column aliases from datasets (e.g., if a user uses "txn_val" instead of "revenue").
    2. Append these aliases to the `KPIDefinition` in `kpi-library.ts`.
    3. Generate a `DOMAIN_KPI_BLUEPRINTS.json` that acts as a runtime override/extension to the static library.

---

## 🚀 Phase 3: The "Data Brain" CLI (Global Data Awareness)

### Goal
Create a unified tool where Ollama can "see" all uploaded data and provide cross-domain insights.

### Features
- **Global Metadata Packaging**: Compresses headers, sample values, and domain types into a single context-efficient payload.
- **Cross-Domain Reasoning**: Allows the user to ask questions like "How does my SaaS churn correlate with my Finance cash flow?"
- **Automatic Blueprint Validation**: Checks if the current data supports the required KPIs for a domain.

---

## 🧪 Phase 4: Validation & Testing

### Strategy
1. **Dry Run**: Verify that the CLI can parse all datasets without errors.
2. **Model Verification**: Run a standard "Domain Intelligence Test" for each updated model.
3. **End-to-End Workflow**: Upload a "dirty" CSV, let the platform clean it, identify the domain, and select the correct KPIs using the newly fine-tuned blueprints.

---

## 📅 Execution Roadmap
1. [x] Research existing Modelfiles and KPI Library.
2. [ ] Create `scripts/fine-tune-domains.ts` (CLI).
3. [ ] Run fine-tuning for all 8 domains.
4. [ ] Validate updated models with sample queries.
5. [ ] Integrate "Global Data Brain" into the main UI/CLI.
