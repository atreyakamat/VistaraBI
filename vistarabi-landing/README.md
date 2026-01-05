# 🚀 VistaraBI - Intelligent Business Analytics Platform

A next-generation business intelligence platform that combines rule-based detection, AI semantic reasoning, and human governance to deliver domain-specific insights.

---

## ✨ Key Features

### 🎯 **Unified Domain Classification**
- **Auto Detection**: Rule-based keyword matching across 8 business domains
- **AI Suggestion**: Local LLM semantic reasoning (Ollama + qwen3:0.6b)
- **Manual Selection**: User-driven domain assignment
- **Governance Layer**: Full version history, audit trails, and domain locking

### 📊 **Data Intelligence**
- Magic byte file format detection
- Enhanced data type inference
- Automated data cleaning & normalization
- Quality scoring & outlier detection
- Relationship discovery

### 🧠 **AI-Powered**
- Local Ollama integration (privacy-first)
- Explainable AI reasoning
- Semantic domain understanding
- No cloud dependencies

---

## 🏗️ Architecture

```
VistaraBI Platform
├── Module 1: Data Ingestion & Type Inference
├── Module 2: Data Purification & Quality Analysis
├── Module 3: Domain Classification (Complete ✅)
│   ├── Phase 3A: Rule-Based Detection
│   ├── Phase 3B: Governance Layer
│   └── Phase 3C: AI Semantic Reasoning
├── Module 4: KPI Engine (Coming Soon)
├── Module 5: Analytics & Forecasting (Coming Soon)
└── Module 6-9: Advanced Features (Planned)
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20+
- **npm** v10+
- **Ollama** ([Download](https://ollama.com))

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd vistarabi-landing

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env

# 4. Start Ollama
ollama serve

# 5. Pull AI model
ollama pull qwen3:0.6b

# 6. Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📖 Documentation

- [**SETUP.md**](./SETUP.md) - Complete setup guide
- [**MODULE_3_COMPLETE.md**](./MODULE_3_COMPLETE.md) - Module 3 technical details
- [**MODULE_3_PHASE_3C_COMPLETE.md**](./MODULE_3_PHASE_3C_COMPLETE.md) - AI reasoning layer
- [**UNIFIED_DOMAIN_SELECTION.md**](./UNIFIED_DOMAIN_SELECTION.md) - UI/UX documentation
- [**DOMAIN_KPI_SELECTION.md**](./DOMAIN_KPI_SELECTION.md) - KPI library

---

## 🎯 Domain Selection

VistaraBI automatically classifies your business data into one of 8 domains:

| Domain | Icon | Description |
|--------|------|-------------|
| E-Commerce | 🛒 | Orders, products, customers, carts |
| SaaS | 💻 | Subscriptions, users, MRR, churn |
| EdTech | 🎓 | Students, courses, enrollments, grades |
| Retail | 🏪 | Inventory, POS, sales, stores |
| Services | 🧾 | Projects, clients, billing, hours  |
| Manufacturing | 🏭 | Production, batches, quality, yield |
| Healthcare | 🏥 | Patients, appointments, treatments |
| Finance | 💰 | Accounts, transactions, loans |

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4, Framer Motion
- **Backend**: Next.js API Routes, TypeScript
- **Database**: Enhanced In-Memory Store (dev), Prisma-ready
- **AI**: Ollama (local), qwen3:0.6b model
- **Data Processing**: PapaParse, XLSX

---

## 📊 Modules Status

| Module | Status | Description |
|--------|--------|-------------|
| Module 1 | ✅ Complete | Data Ingestion & Type Inference |
| Module 2 | ✅ Complete | Purification & Quality Analysis |
| Module 3A | ✅ Complete | Rule-Based Domain Detection |
| Module 3B | ✅ Complete | Domain Governance Layer |
| Module 3C | ✅ Complete | AI Semantic Reasoning |
| Module 4 | 🚧 Planned | KPI Calculation Engine |
| Module 5 | 🚧 Planned | Trend Analysis & Forecasting |
| Module 6-9 | 📋 Planned | Advanced Features |

---

## 🧪 Testing

```bash
# Type check
npx tsc --noEmit

# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 🤝 Contributing

This is a research-grade project. For questions or contributions, please refer to the documentation files.

---

## 📜 License

Proprietary - All Rights Reserved

---

## 🙏 Acknowledgments

Built with:
- Next.js, React, TailwindCSS
- Ollama (Local LLM)
- Framer Motion (Animations)
- TypeScript (Type Safety)

---

**Happy Analyzing! 📊✨**
