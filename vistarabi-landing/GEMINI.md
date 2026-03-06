# GEMINI.md - VistaraBI Project Context

This document provides essential context and instructions for AI agents working on the **VistaraBI** project.

## 🚀 Project Overview

**VistaraBI** is an intelligent business analytics platform designed to transform raw data files (CSV, JSON, XML, etc.) into actionable insights. It combines rule-based data detection, AI-driven semantic reasoning, and human governance.

### Core Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4, Framer Motion.
- **Backend**: Next.js API Routes, TypeScript.
- **Database**: PostgreSQL with Prisma ORM.
- **AI**: Local Ollama integration (typically `qwen3:0.6b`) for privacy-first semantic reasoning.
- **Testing**: Vitest for unit/integration testing.

### Architecture
The project follows a modular evolution:
- **Module 1**: Data Ingestion & Type Inference.
- **Module 2**: Data Purification & Quality Analysis.
- **Module 3**: Domain Classification (E-Commerce, SaaS, EdTech, etc.).
- **Module 4**: KPI Engine & Data Lineage.
- **Module 5**: Analytics, Dashboards & Forecasting.
- **Module 6**: AI Command Execution & Governance.

---

## 🛠 Building and Running

### Prerequisites
- Node.js v20+, npm v10+.
- [Ollama](https://ollama.com) installed and running locally.

### Key Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server at `http://localhost:3000`.
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.
- `npx prisma migrate dev`: Run database migrations.
- `npx prisma generate`: Generate the Prisma client.

### AI Setup
- Ensure Ollama is serving: `ollama serve`.
- Pull the recommended model: `ollama pull qwen3:0.6b`.

---

## 🧪 Testing Guidelines

### Test Execution
- `npm test`: Runs the main Vitest suite.
- `npm run test:4d`, `test:5a`, etc.: Runs module-specific tests (defined in `package.json`).
- Root `tests/` directory contains structured integration and unit tests for each module.

### Testing Standards
- **Mocking**: Use `vitest-mock-extended` for mocking Prisma. Avoid direct database connectivity in unit tests.
- **Data Generation**: Use `tests/data/test-data-generator.ts` for creating realistic business datasets.
- **Validation**: Ensure all mocks include required nested structures (e.g., `aggregations`, `joinPaths`) to satisfy strict validation logic.

---

## 📐 Development Conventions

- **Type Safety**: Avoid using `any`. Prefer strict interfaces or Zod schemas for runtime validation, especially when dealing with Prisma's `Json` columns.
- **Modular Logic**: Keep domain-specific logic within its respective `src/lib` subdirectory (e.g., `src/lib/domain`, `src/lib/kpi`).
- **Prisma Singleton**: Always use the singleton pattern from `src/lib/prisma.ts` for database access.
- **Error Handling**: Use standardized custom error classes (e.g., `SemanticResolutionError`) for consistent error reporting across modules.
- **Style**: Adhere to TailwindCSS 4 conventions. Use Framer Motion for interactive UI components.

---

## ⚠️ Current Challenges & Refactoring Goals

Refer to `CODEBASE_AUDIT_AND_REFACTORING_PLAN.md` for detailed technical debt status.
1. **Type Drift**: Manually maintained interfaces for JSON columns need transition to Zod-backed validation.
2. **Test Decoupling**: Many tests currently fail if a live database is not present; these need refactoring to use isolated mocks.
3. **AI Pipeline Consolidation**: Module 6 is currently fragmented and needs unification into a cohesive pipeline.
4. **KPI Registry Scalability**: Transitioning from a static registry to a more dynamic, configuration-driven model.

---

## 📂 Key Files & Directories

- `src/app/`: Next.js App Router pages and API routes.
- `src/lib/`: Core business logic, split by module and functionality.
- `prisma/schema.prisma`: The source of truth for the data model.
- `tests/`: Comprehensive testing suites.
- `README.md`: High-level project summary and quick start.
- `MODULE_X_COMPLETE.md`: Technical documentation for specific completed modules.

---

*Last Updated: March 2026*
