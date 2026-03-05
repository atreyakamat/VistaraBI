# Lingering Codebase Errors & Tech Debt

Following the successful execution of Phase 1 (Test Stabilization) and Phase 3 (AI Pipeline Consolidation), the project compiles (`tsc`), builds (`next build`), and passes all unit tests (`vitest`). 

The remaining errors are strictly **ESLint violations** centered around technical debt and type safety.

## ESLint Summary
**Total Problems:** 531 (382 errors, 149 warnings)

### Primary Issue: `any` Type Usage
The vast majority of errors are `@typescript-eslint/no-explicit-any`. This aligns with the "Type Drift" identified in the codebase audit. While we fixed the execution pipeline (`pool.ts`, `sql-compiler.ts`, `ask-ai/route.ts`), many other files still rely on `any`.

**Key areas requiring type strictness:**
1. **API Routes:**
   - `src/app/api/projects/[id]/dashboard-state/route.ts`
   - `src/app/api/projects/[id]/data-lineage/route.ts`
   - `src/app/api/projects/[id]/insights/route.ts`
2. **Core Libraries:**
   - `src/lib/kpi/ai-kpi-discovery.ts`
   - `src/lib/intelligence/index.ts`
   - `src/lib/visualization/index.ts`
3. **Test Mocks:**
   - Many test files (e.g., `tests/module2.e2e.ts`, `tests/module6a/execution-bridge.test.ts`) use `as any` to bypass strict mocking requirements.

### Secondary Issues
1. **Unused Variables:** There are ~149 warnings for variables that are declared but never read (`@typescript-eslint/no-unused-vars`). This clutters the codebase and should be cleaned up.
2. **Prefer Const:** A few instances where `let` is used but the variable is never reassigned (e.g., in `src/lib/module-6/validation-pipeline.ts`).
3. **Deprecated Imports:** A `require()` style import is still present in `migrate.js`.
4. **Next.js Deprecation Warning:** During the build, Next.js flagged: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

## Next Steps Recommendation
To truly streamline the project and finish Phase 2, we should incrementally replace the remaining `any` usages with exact `zod` schemas or precise TypeScript interfaces, starting with the API boundary layers.
