# 🚀 VistaraBI - Intelligent Business Analytics Platform

VistaraBI is a next-generation business intelligence platform that transforms raw data into actionable executive strategy. It combines automated data engineering, AI semantic reasoning, and prescriptive intelligence to help businesses grow across 8 key domains.

---

## ✨ Key Features

### 🎯 **Unified Domain Intelligence**
- **8-Domain Coverage**: Deep specialization in E-Commerce, SaaS, EdTech, Retail, Services, Manufacturing, Healthcare, and Finance.
- **Auto-Detection**: Rule-based keyword matching and AI semantic reasoning for perfect data classification.
- **Semantic Mapping**: Automatically maps raw columns (e.g., "txn_val") to semantic roles ("revenue").

### 📊 **Prescriptive Analytics**
- **KPI Engine**: Automated discovery and calculation of domain-specific metrics.
- **Strategy Canvas (Module 8)**: Non-linear, Prophet-powered forecasting with Monte Carlo simulations to predict goal success.
- **Goal Engine (Module 7)**: AI-driven action plans to bridge the gap between current performance and future targets.

### 🧠 **Agentic AI Mesh**
- **Multi-Agent Router**: Orchestrates 9 specialized personas (Business Analyst, Statistician, Data Engineer, etc.).
- **Unified AI Client**: Robust fallback chain (Local Ollama → Cloud Ollama → OpenRouter).
- **Local-First Privacy**: Optimized for `qwen3.5:0.8b` to ensure high performance on standard hardware.

---

## 🏗️ Architecture

```
VistaraBI Platform
├── Module 1: Data Ingestion & Type Inference ✅
├── Module 2: Data Purification & Quality Analysis ✅
├── Module 3: Domain Classification & Governance ✅
├── Module 4: KPI Discovery & Lineage ✅
├── Module 5: Glassmorphism Dashboard & Interaction ✅
├── Module 6: AI Command Execution & Chat ✅
├── Module 7: Goal Strategy Engine (Prescriptive) ✅
├── Module 8: Strategy Canvas & Forecasting ✅
└── Module 9: Executive Board Report Engine ✅
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20+
- **npm** v10+
- **Ollama** ([Download](https://ollama.com))
- **Python 3.10+** (For Module 8 Forecasting)

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd vistarabi-landing

# 2. Install Dependencies
npm install
pip install pandas prophet

# 3. Setup Environment
cp .env.example .env  # Update with your Cloud AI keys if needed

# 4. Pull AI Models
ollama pull qwen3.5:0.8b
ollama pull qwen2.5-coder:1.5b

# 5. Fine-Tune Local Models
npx tsx scripts/ingest-and-tune.ts

# 6. Run Platform
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📖 Key Documentation

- [**VISTARABI_INTELLIGENCE_MANUAL.md**](./VISTARABI_INTELLIGENCE_MANUAL.md) - **Primary guide** for AI ingestion & tuning.
- [**RETAIL_IMPLEMENTATION_COMPLETED.md**](./RETAIL_IMPLEMENTATION_COMPLETED.md) - Case study of the Retail domain completion.
- [**SETUP.md**](./SETUP.md) - Detailed environment setup.
- [**AI_QUICK_REFERENCE.md**](./AI_QUICK_REFERENCE.md) - Agent roles and API usage.

---

## 🎯 Supported Domains

| Domain | Icon | Key Focus |
|--------|------|-----------|
| E-Commerce | 🛒 | GMV, AOV, Conversion, Retention |
| SaaS | 💻 | MRR, Churn, CAC, LTV, NRR |
| EdTech | 🎓 | Completion, Enrollment, Engagement |
| Retail | 🏪 | Inventory Turnover, Shrinkage, POS |
| Services | 🧾 | Utilization, Billable Hours, Margin |
| Manufacturing | 🏭 | OEE, Yield Rate, Downtime, Scrap |
| Healthcare | 🏥 | Bed Occupancy, ALOS, No-Show Rate |
| Finance | 💰 | NPA Ratio, ROA, Cash Flow, Risk |

---

## 🧪 Testing & Quality

```bash
# Run all deterministic tests
npm test

# Run Module 8 Forecast tests
npm run test:8

# Run Module 9 Report tests
npm run test:9

# Check AI Health
curl http://localhost:3000/api/v1/ai/health
```

---

## 📜 License

Proprietary - All Rights Reserved © 2026 VistaraBI

**Empowering Data with Prescriptive Intelligence. 📊✨**
