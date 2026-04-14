# VistaraBI - Current Project State (2026-04-14)

## 1) Executive Snapshot

| Area | Current State | Evidence |
|---|---|---|
| Retail dataset profiling | ✅ Complete | `datasets/retail/retail-feature-catalog.json` generated from 8 CSV files |
| Retail model alignment | ✅ Complete | `modelfiles/Modelfile.analytics.retail` regenerated and `vistara-analytics-retail` refreshed |
| Module 7 (Goal engine) | ✅ Stable | `npm run test:7` passing |
| Module 8 (Forecasting/canvas) | ✅ Stable | `npm run test:8` passing |
| Module 9 (Report engine) | ✅ Stable | `npm run test:9` passing |
| Production build | ✅ Stable | `npm run build` passing |
| Repo lint baseline | ❌ Not clean | `npm run lint` reports **562 issues** (368 errors, 194 warnings) |
| Full CI tests (`test:ci`) | ⚠️ Unstable in current env | Suite stalls on AI-heavy E2E tests (`tests/e2e-all-modules.test.ts`) |

---

## 2) What Remains (Beyond Domain Fine-Tuning)

## A. Engineering Quality Gates
1. Reduce lint debt across `src/`, `scripts/`, and `tests/` (large `no-explicit-any`, hook, and import-style violations).
2. Decide lint policy boundaries (for example, whether migration/dev scripts should be linted under the same strict rules as app code).
3. Enforce clean PR gate: build + module tests + lint on changed files at minimum.

## B. CI/E2E Reliability
1. Split AI-live tests from deterministic CI tests.
2. Mark AI-live suite as integration/nightly with explicit env requirements.
3. Add mock-based equivalents for fallback-chain behavior so CI does not depend on provider response time.

## C. Documentation Accuracy (High Priority)
Current docs are partially stale relative to the actual implementation:
- `README.md` still says Modules 4-9 are planned and references older AI model assumptions.
- `AI_QUICK_REFERENCE.md`, `IMPLEMENTATION_SUMMARY.md`, `PRODUCTION_DEPLOYMENT.md` still reference `qwen3.5:2b`.

## D. Product Hardening (for complete scope)
1. Add explicit UI status/fallback messaging when AI providers are slow/unavailable.
2. Add one-click "demo seed + walkthrough" flow for presentation repeatability.
3. Add regression checks for the Module 7 -> 8 -> 9 user journey (goal generation to forecast to PDF).

## E. Ops/Deployment Maturity
1. Resolve Next.js warnings (`middleware` deprecation to `proxy`; workspace root lockfile warning).
2. Define runbook for AI provider health, timeout thresholds, and fallback order.
3. Add centralized monitoring for API latency, AI failure rates, and report generation success.

---

## 3) How to Connect More / Make It Better

| Improvement | What to Connect | Practical Path |
|---|---|---|
| Reliable AI chain | Ola/Ollama Cloud + local fallback + OpenRouter | Standardize env templates and add startup health checks |
| Live business data | Warehouse/DB connectors (Postgres first) | Build source adapters + scheduled ingestion + schema mapping |
| Executive reporting workflow | Report output to shared channels | Add delivery connectors (email/drive/slack) after PDF generation |
| Product analytics | Observability stack | Add structured logs + dashboard for module-level success/failure |
| Repeatable demos | Demo project bootstrap | Scripted seed dataset + scripted goal/forecast/report sequence |

---

## 4) Recommended Execution Order

1. **P0 (immediate):** Documentation sync + CI split (deterministic vs AI-live) + lint policy decision.
2. **P1:** Lint debt cleanup in app-critical files and core APIs.
3. **P2:** UX hardening, observability, and external connectors.

---

## 5) Current Verification Commands

```bash
npm run build
npm run test:7
npm run test:8
npm run test:9
npm run profile:domain -- RETAIL
npm run ingest:retail
```

