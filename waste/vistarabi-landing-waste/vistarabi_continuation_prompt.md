# VistaraBI — Master Continuation Prompt
**Use this file at the start of every new session to resume work.**
**Project root:** `c:\Projects\VistaraBI\vistarabi-landing`
**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Prisma 5 + PostgreSQL, Tailwind CSS, Sonner toasts, Framer Motion, Ollama (local AI), Resend (email), `next/og` (OG image)

---

## 1. Platform State (What Is Built & Working)

### Core AI Pipeline (All ✅)
- **M1 Ingestion** — CSV/JSON/XML/XLSX parsing with magic byte detection
- **M2 Purification** — Null fill, dedupe, date normalize, currency, outlier removal
- **M2 UI** — `CleaningSummary.tsx` (row flow, retention rate) + `IngestionProgress.tsx` (6-stage real-time tracker)
- **M3 Domain Classification** — 8 domains, 240 patterns, AI confidence scoring
- **M4 KPI Engine** — 200+ KPIs, lineage, semantic matching
- **M5 Dashboards** — Chart rendering, drill-down, anomaly detection, caching
- **M7 Goal Strategy** — NL goal parsing, 3 scenarios, factor decomposition
- **M9 PDF Reports** — LLM narrative, React-PDF, html2canvas chart capture

### Auth & Security (All ✅)
- `src/proxy.ts` — JWT auth guard, rate limiting, security headers, response-time logging
- `src/lib/env.ts` — startup env validation (wired into layout.tsx)
- `src/components/auth/SessionGuard.tsx` — global 401 → redirect to /login
- Forgot/reset password flow complete
- **Email Verification** — verify-email flow wired via Resend
- **Notification Engine** — In-app notification Prisma schema and utility available

### Production Hardening (All ✅)
- **BUILD SUCCESS** — Full TypeScript compliance, `EXIT_CODE: 0` achieved.
- `error.tsx`, `not-found.tsx`, 4× `loading.tsx` skeleton pages
- `opengraph-image.tsx` (dynamic OG), `sitemap.ts`, `robots.txt`, `manifest.json` (PWA)
- `UploadZone.tsx` — client-side 50MB + extension validation
- Server-side 50MB upload cap in `/api/projects/[id]/sources/route.ts`
- DB Connection Pooling — configured in `.env`
- API Errors — Standardized using `apiError()` utility

### Growth Features (All ✅)
- **Stripe Billing** — Setup complete with plan enforcement logic
- `SharePanel.tsx` — share token generation, copy link, iFrame embed code, revoke
- `/share/[token]` — public read-only dashboard page (integrated with `?share=1` UX)
- `ExportButton.tsx` → `/api/projects/[id]/export` — CSV download
- `/api/templates/[domain]` — 8 domain CSV templates (discoverable in upload UI)
- `HelpTooltip.tsx` + `DASHBOARD_TOOLTIPS` — wired into KPI cards
- `DemoCTABanner.tsx` — auto-injected dynamically into domain demo pages
- `InviteButton.tsx` — referral link in dashboard sidebar
- Welcome email via Resend on registration

---

## 2. Post-Funding Feature Roadmap

### Feature 3 — Teams & Multi-Tenancy
**Priority:** 🟡 High (B2B requirement)
**Effort:** 1 week
1. Add `Team`, `TeamMember` to `prisma/schema.prisma`
2. Create `src/app/app/teams/page.tsx`
3. Update project ownership checks

### Feature 4 — Two-Factor Authentication (2FA)
**Priority:** 🟡 High (enterprise requirement)
**Effort:** 1 day
1. Use `otplib` and `qrcode`
2. Create `/api/auth/2fa/*` setup, verify, authenticate
3. Add security settings page

### Feature 5 — Persistent AI Chat Memory (Redis)
**Priority:** 🟡 High (user retention)
**Effort:** 1 day
1. Use `ioredis`
2. Connect to `AskAIPanel` memory

### Feature 8 — Mobile Responsive Audit
**Priority:** 🟢 Medium
**Effort:** 1 day
1. Optimize Grid Layout for `<768px` in `DashboardShell.tsx`
2. Hide/Collapse non-essential UI.

### Feature 9 — Advanced Forecasting Engine
**Priority:** 🟢 Medium (post-funding R&D)
**Effort:** 3 days
1. Implement ARIMA/Prophet models for seasonality.

---

## 3. Environment Variables Checklist

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/vistarabi?connection_limit=5&pool_timeout=20
JWT_SECRET=<minimum 64 chars of random entropy>

# Required for AI (at least one)
OLLAMA_BASE_URL=http://localhost:11434
OPENROUTER_API_KEY=sk-or-... 

# Email
RESEND_API_KEY=re_...

# Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# AI Chat Memory
REDIS_URL=redis://localhost:6379

# App URL
NEXT_PUBLIC_APP_URL=https://vistarabi.com
```

---

## 4. Exact Workflow for Each New Session

```
1. cd c:\Projects\VistaraBI\vistarabi-landing
2. npx prisma generate          ← regenerate client after any schema changes
3. npm run dev                  ← start dev server on :3000
4. Check build: npx next build  ← must exit 0 before declaring anything done
```
