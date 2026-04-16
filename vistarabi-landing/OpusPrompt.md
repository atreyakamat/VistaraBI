# 🧠 Master Platform Audit Prompt (For Claude 3.5 Sonnet / Opus)

**Task:** Perform a deep architectural audit and cross-domain scaling validation for the VistaraBI platform.

---

### 📋 Copy/Paste the following prompt into Claude:

"You are a Principal Software Architect and AI Engineer. I have just stabilized the **VistaraBI** platform for the Retail domain. Now, I need you to audit the entire system to ensure it is ready to scale to the remaining 7 domains (Finance, SaaS, Manufacturing, etc.).

**Codebase Architecture:**
- **SQL Execution:** `src/lib/execution/` uses a materializer to create project-specific Postgres tables from raw CSVs.
- **KPI Engine:** `src/lib/kpi/` uses a Semantic Alias library to map raw headers to business metrics.
- **AI Routing:** `src/lib/ai/` uses a MasterAgent to route queries between local (0.8B) and cloud (397B) models based on 9 specialized personas.
- **Reporting:** `src/lib/module-9/` generates React-PDF reports synthesizing data from all modules.

**Your Critical Audit Tasks:**

1. **SQL Stability:** Review **`src/lib/execution/sql-compiler.ts`**. We recently fixed a `date_trunc` type mismatch using explicit casts. Analyze the code for any other potential PostgreSQL type collisions (e.g., trying to `SUM` a text column that wasn't properly cast to `NUMERIC`).
2. **Semantic Robustness:** Audit **`src/lib/kpi/index.ts`**. We updated it to strictly filter `isComputable` KPIs. Verify the logic that replaces formula placeholders (like `{revenue}`) with physical columns. Does it handle cases where multiple columns map to the same semantic role?
3. **Forecasting Reliability:** Review **`src/lib/module-8/prophet-bridge.ts`**. Ensure the bridge correctly handles 'sparse data' (days with missing values) before sending it to the Python Prophet engine. Propose a data-cleaning step if gaps are detected.
4. **Agentic Conflict:** Look at the 9 agent personas in **`src/lib/ai/unified-ai-client.ts`**. Are there overlaps between `business-analyst` and `strategy-planner` that could confuse the router? Refine the system prompts to ensure clear separation of concerns.
5. **Memory Optimization:** The 397B cloud model is powerful but slow. Propose a 'Context Compression' utility for the **MasterAgent** so we only send necessary schema metadata instead of full sample rows, reducing latency and token costs.

**Deliverable:**
Provide a list of 5 'Immediate Action Items' to bulletproof the platform for a production launch across all 8 domains."
