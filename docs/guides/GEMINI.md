# GEMINI.md - VistaraBI Project Context

This document provides essential context and instructions for AI agents working on the **VistaraBI** project.

## 🚀 Project Overview

**VistaraBI** is an intelligent business analytics platform designed to transform raw data files (CSV, JSON, XML, etc.) into actionable insights. It combines rule-based data detection, AI-driven semantic reasoning, and human governance.

### Core Tech Stack
- **Frontend**: Next.js 16.1 (App Router), React 19.2, TailwindCSS 4.0, Framer Motion.
- **Backend**: Next.js API Routes, TypeScript 5.x.
- **Database**: PostgreSQL with Prisma ORM 5.10.
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
- **Module 7**: Goal Strategy Engine (Prescriptive Intelligence).

---

## 🤖 SAM (Smart Agent Manager)

**SAM** is the autonomous TDD (Test-Driven Development) orchestration system used to develop VistaraBI. It coordinates a team of specialized AI agents:
- **Atlas (Architect)**: Validates PRDs and technical feasibility.
- **Titan (Test Architect)**: Writes failing tests (RED phase).
- **Dyna (Developer)**: Writes minimal code to pass tests (GREEN phase).
- **Argus (Reviewer)**: Improves code quality (REFACTOR phase).

### SAM Commands
- `npx sam-agents`: Launch the SAM interactive installer/updater.
- `activate_skill('sam-orchestrator')`: (Gemini CLI) Start the TDD pipeline.

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
1. **Type Drift**: Manually maintained interfaces for JSON columns need transition to Zod-backed validation (Zod 4.x).
2. **Test Decoupling**: Many tests currently fail if a live database is not present; these need refactoring to use isolated mocks via `vitest-mock-extended`.
3. **AI Pipeline Consolidation**: Module 6 is currently fragmented across multiple sub-directories and needs unification into a cohesive pipeline.
4. **KPI Registry Scalability**: Transitioning from a static registry to a database-driven, configuration-driven model.
5. **Eliminating `any`**: Refactoring critical data-processing layers (`src/lib/execution`) to remove remaining `any` types.

---

## 📂 Key Files & Directories

- `src/app/`: Next.js App Router pages and API routes.
- `src/lib/`: Core business logic, split by module and functionality.
  - `src/lib/module-7/`: Goal Strategy Engine logic.
- `prisma/schema.prisma`: The source of truth for the data model.
- `tests/`: Comprehensive testing suites.
- `_sam/`: SAM Agent definitions and TDD workflows.
- `README.md`: High-level project summary and quick start.
- `MODULE_7_ARCHITECTURE.md`: Technical documentation for the prescriptive intelligence layer.

---

*Last Updated: March 2026*
