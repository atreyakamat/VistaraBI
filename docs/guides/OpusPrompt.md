# 🧠 Project Completion & Production Readiness Prompt (For Claude 3.5 Sonnet / Opus)

**Task:** Execute a final, exhaustive architectural audit, verify system-wide stability, and define the definitive roadmap to 100% completion for the VistaraBI platform across all 8 domains.

---

### 📋 Copy/Paste the following prompt into Claude:

"You are a Principal Software Architect, Lead QA Engineer, and AI Systems Expert. We are at the final stage of the **VistaraBI** development cycle. I have 'stabilized' the platform for the Retail domain, but I need you to act as the final authority to ensure this system is truly production-ready and ready to scale across all 8 domains (Finance, SaaS, Manufacturing, etc.).

**Codebase Architecture Overview:**
- **SQL Execution:** `src/lib/execution/` (Materializer, SQL Compiler).
- **KPI Engine:** `src/lib/kpi/` (Semantic Resolver, Matcher, Library).
- **AI Routing:** `src/lib/ai/` (MasterAgent, Unified Client, Personas).
- **Forecasting:** `src/lib/module-8/` (Prophet Bridge, Strategy Validator).
- **Reporting:** `src/lib/module-9/` (React-PDF synthesis).

**Your Mission: The Final Completion & Validation Audit**

### 1. 🔍 Technical Verification (Is the current state actually correct?)
- **SQL Integrity:** Audit `src/lib/execution/sql-compiler.ts`. Verify if the recent `DATE_TRUNC` and `NUMERIC` casting fixes are architecturally sound. Check for 'silent failures' in `MIN`/`MAX` aggregations on text columns and potential division-by-zero errors in complex formulas.
- **Semantic Mapping:** Review `src/lib/kpi/index.ts`. Does the regex-based placeholder replacement handle special characters, overlapping column names, or multi-source joins correctly? Verify if the 'bestMatch' logic in `kpi-matcher.ts` prevents collisions.
- **AI Routing Logic:** Audit `src/lib/ai/master-agent.ts` and `unified-ai-client.ts`. Is the routing deterministic? Are the 9 personas sufficiently distinct? Verify if the context window is being managed efficiently (Context Compression) or if large schemas will crash the local 0.8B model.

### 2. 🧪 Robust Testing & Edge Case Validation
- **Sparse Data:** How does the system behave when a CSV has 3 months of data but only 10 actual entries? Verify if `prophet-bridge.ts` handles this or if it produces skewed forecasts.
- **Dirty Data:** Check the `data-profiler.ts` and `data-materializer.ts`. Does the system gracefully handle mixed types in the same column (e.g., '100' and 'N/A')?
- **E2E Flow:** Verify the integration between Module 4 (KPIs) -> Module 8 (Forecasting) -> Module 9 (Reporting). Is data lineage preserved across this pipeline?

### 3. 🗺️ Roadmap to 100% Completion (What is remaining?)
- **Domain Scaling:** Identify what is missing to enable the other 7 domains. Is the metadata in `kpi-library.ts` and `semantic-column-aliases.ts` exhaustive for Finance, Manufacturing, and Healthcare?
- **UI/UX Production Gaps:** Are there missing loading states, error boundaries, or 'AI reasoning' visualizations needed for a polished user experience?
- **Performance:** Identify latency bottlenecks in the MasterAgent's fallback chain.

### 4. 🛡️ Security & Scalability Audit
- **SQL Injection:** Confirm that the double-quoting and parameterization in `sql-compiler.ts` is 100% bulletproof for production.
- **Token Costs:** Propose a strategy to minimize 'Cloud Model' usage without sacrificing reasoning quality.

**Final Deliverables:**
1. **The 'Truth Report':** A brutal assessment of whether the current stabilization efforts are technically correct or just 'surface fixes'.
2. **The 'Gap Analysis':** A complete list of every missing feature, bug, or architectural weakness preventing a 100% production launch.
3. **The 'Definitive Action Plan':** A prioritized, step-by-step checklist to complete the project, including a **Robust Testing Protocol** to verify the platform's stability under real-world 'dirty data' conditions."