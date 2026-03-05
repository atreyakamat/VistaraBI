# VistaraBI: Codebase Audit & Refactoring Plan

## 1. Executive Summary
This document provides a comprehensive audit of the `VistaraBI` codebase. It evaluates the architectural design, code quality, technical debt, and testing infrastructure. Overall, the project demonstrates a sophisticated, modular architecture tailored for an AI-driven Business Intelligence platform. However, the codebase currently suffers from type-safety gaps, fragmented module responsibilities, and brittle testing infrastructure that requires immediate refactoring to ensure long-term maintainability.

## 2. Architectural Overview & Issues

### 2.1 JSON-Heavy Data Model & Type Drift
**Finding:** The application heavily utilizes JSON columns in Prisma (e.g., `dashboardConfig`, `relationships`, `lineage`) to store complex, dynamic structures.
**Issue:** While this provides immense flexibility, it shifts the burden of type safety from the database strictly into the application layer. Currently, TypeScript interfaces mapping to these JSON structures (found in `src/lib/prisma.ts`) are manually maintained. This creates "Type Drift," where the database's actual JSON shape can silently diverge from the TypeScript expectations, leading to runtime crashes.

### 2.2 AI Pipeline (Module 6) Fragmentation
**Finding:** The AI logic is deeply split across several sub-modules (`module-6a` through `module-6f`).
**Issue:** This fragmentation creates "folder sprawl." A single AI execution pipeline must traverse multiple disconnected libraries, making debugging, tracing, and onboarding unnecessarily complex. The execution flow is difficult to follow without a unified pipeline pattern.

### 2.3 Semantic KPI Engine Scalability
**Finding:** The KPI engine decouples business logic from physical schemas using "Semantic Roles." Business logic for 8 different domains is centralized in `src/lib/kpi/kpi-rule-registry.ts`.
**Issue:** As more domains are added, this static configuration file will become unmanageable and bloated. It tightly couples data configurations with source code.

## 3. Code Quality & Technical Debt

### 3.1 Unsafe Typing (`any` Usage)
**Finding:** Running `eslint` reveals over 500 warnings/errors, almost exclusively stemming from the use of `any` (`@typescript-eslint/no-explicit-any`).
**Issue:** Large portions of the execution engine (`src/lib/execution`), AI handlers (`src/app/api/projects/[id]/ask-ai`), and data lineage tools are bypassing TypeScript. This entirely defeats the purpose of TS in critical data-processing layers, creating silent points of failure during data transformations.

### 3.2 Error Handling Consistency
**Finding:** Throughout the `lib` directories, error throwing and handling are somewhat inconsistent. Standardized custom error classes (like `SemanticResolutionError`) exist but are not uniformly utilized across all execution modules.

## 4. Testing Infrastructure Issues

### 4.1 Database Coupling in Unit Tests
**Finding:** Running the `vitest` suite yields several failures primarily due to database connectivity errors (`PrismaClientInitializationError: Invalid db.dashboardState.deleteMany()`).
**Issue:** Unit tests (like those in `module-5-5/state-engine.test.ts` and `module-5b/executor.test.ts`) are attempting to connect to a live Prisma database (requiring `DATABASE_URL`) instead of using isolated mocks. Unit tests must be completely decoupled from the physical database to run reliably in CI/CD environments.

### 4.2 Mock Fidelity
**Finding:** Boundary failures occurred in the test suite (e.g., `Blueprint KPIs are missing aggregation rules`) because the mocked Prisma responses did not perfectly mirror the strict requirements of the production logic.
**Issue:** Mock objects used across `vitest` need to be unified and validated against the actual Types/Schemas.

---

## 5. Actionable Refactoring Plan

To systematically improve the codebase, the following phased refactoring plan is recommended:

### Phase 1: Test Suite Stabilization (Immediate Priority)
1. **Implement `prisma-mock`:** Replace direct DB imports in all non-integration tests with `vitest-mock-extended` and `jest-mock-extended` standard Prisma mocking.
2. **Abstract DB Operations:** For tests that intrinsically require a database, migrate them to a separate `e2e` or `integration` folder and utilize a dedicated Dockerized test database.
3. **Fix Broken Mocks:** Ensure all `Blueprint` and `Lineage` mocks include required nested arrays (like `aggregations` and `joinPaths`) to prevent boundary validation failures.

### Phase 2: Type Safety & Zod Integration (High Priority)
1. **Eliminate `any`:** Systematically refactor `src/lib/execution/pool.ts`, `src/lib/execution/sql-compiler.ts`, and `ask-ai/route.ts` to replace `any` with strict generic types or `unknown` combined with type-guards.
2. **Implement Zod Schemas:** For all data read from Prisma JSON columns (e.g., `dashboardConfig`), introduce `zod` schema parsing. 
   * *Action:* When fetching data via Prisma, pass the JSON through a Zod `.parse()` method to guarantee runtime type safety at the boundary layer.

### Phase 3: AI Pipeline Consolidation (Medium Priority)
1. **Unify Module 6:** Refactor `module-6a` through `module-6f` into a single, cohesive `module-6` directory.
2. **Chain of Responsibility Pattern:** Implement a strict pipeline or Middleware pattern (e.g., Validation -> Semantic Parsing -> Local AI -> Cloud Fallback) so the flow of data is linear and state transitions are explicitly typed.

### Phase 4: Dynamic Configuration (Low Priority / Future Proofing)
1. **Decouple KPI Registry:** Migrate `kpi-rule-registry.ts` from static TypeScript arrays into a database-driven registry or split it into separate `.json`/`.yaml` configuration files per domain.
2. **Dynamic Loading:** Implement a loader that caches these domain rules in memory at server start, keeping the application bundle lightweight.
