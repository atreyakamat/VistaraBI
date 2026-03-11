# Module 7: Goal Strategy Engine (Refined Architecture)

## Overview & Purpose
Module 7 is the **prescriptive intelligence layer** of the VistaraBI platform. While Modules 4–6 focus on understanding data, generating KPIs, and interactive analysis, Module 7 translates high-level business goals (e.g., *"Increase revenue by 20% this quarter"*) into a structured, data-backed execution strategy.

It bridges the gap between descriptive analytics (what happened) and prescriptive action (what should we do next), ensuring recommendations are grounded in the user's real data and the KPI relationships discovered in Module 4.

---

## 🛤️ Evolution of the Platform
The platform follows a natural progression where each module builds on the structured output of the previous one:

```text
Dataset → Module 4 (KPI Reasoning) → Module 5 (Dashboard) → Module 6 (AI Interaction) → Module 7 (Goal Strategy)
```

1.  **Module 4:** Creates the KPI Blueprint.
2.  **Module 5:** Generates the dashboard and execution engine.
3.  **Module 6:** Enables AI chat and contextual commands.
4.  **Module 7:** Answers: *"Given everything we know, what should you actually do next?"*

---

## 🏗️ The Decision Pipeline
Module 7 operates as a linear pipeline, transforming a natural language goal into a "Strategy Canvas."

### Stage 1: Goal Parser
*   **Input:** "Increase revenue by 20% this quarter"
*   **Action:** Extracts `metric`, `target_change`, and `timeframe`.
*   **Tech:** Regex patterns for speed + lightweight Ollama confirmation for validation.

### Stage 2: Goal → KPI Mapping
*   **Action:** Maps the parsed metric to a validated KPI from the **Module 4 Blueprint**.
*   **Logic:** Ensures goals are tied to approved business formulas (e.g., `kpi_revenue_total`) rather than raw columns.

### Stage 3: Goal Decomposer
*   **Action:** Breaks the target KPI into contributing factors using the blueprint's formulas.
*   **Example:** `Revenue = Units × AOV × (1 - Discount Rate)`. If Revenue must grow 20%, the decomposer calculates paths like "Units +20%" or "AOV +10% & Units +10%".
*   **Tech:** Deterministic math based on historical data.

### Stage 4: Strategy Generation (AI Layer)
*   **Action:** Ollama generates creative, context-aware strategies for the identified sub-KPIs.
*   **Output:** Action names, effectiveness, domain fit, cost range, and time to impact.

### Stage 5: Strategy Ranking
*   **Action:** Scores generated strategies using a normalized formula: `(Effectiveness × Domain Fit × Cost Efficiency × Speed) / 4`.
*   **Goal:** Selects the top 3 highest-confidence actions.

### Stage 6: Scenario Builder
*   **Action:** Generates three execution plans per action representing different investment levels:
    *   **Lean:** Bootstrapped/Manual.
    *   **Balanced:** Standard tools/Light spend.
    *   **Premium:** Aggressive investment/Agencies.

### Stage 7: Location Strategy Split
*   **Action:** Customizes the strategy by location/store performance if a location dimension exists.
*   **Example:** Aggressive strategies for high-performers, conservative for laggards.

---

## 🖥️ UI Placement: The Right Intelligence Sidebar
Module 7 is integrated into the **Right Intelligence Sidebar** to maintain a consistent workflow of "Analyze → Ask → Act."

**Sidebar Structure:**
*   **Tab 1:** AI Chat (Module 6)
*   **Tab 2:** Forecasting Engine
*   **Tab 3:** **Goal Strategy Engine (Module 7)**

The interface features a dedicated goal input field that triggers the multi-step loading sequence (*"Parsing Goal..."* → *"Analyzing Data..."* → *"Generating Strategies..."*) before revealing the **Strategy Canvas**.

---

## 💻 Backend File Architecture
Implementation is contained within `src/lib/module-7/`:

*   `goal-engine.ts`: The central orchestrator for the pipeline.
*   `goal-parser.ts`: Natural language extraction logic.
*   `goal-decomposer.ts`: Mathematical factor analysis.
*   `action-generator.ts`: Ollama strategy brainstorming.
*   `action-ranker.ts`: Scoring and filtering logic.
*   `scenario-builder.ts`: Detailed 3x3 plan generation.
*   `location-splitter.ts`: Performance-based localization.

---

## 🗄️ Database Schema
```prisma
model ProjectGoal {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  rawQuery        String
  targetKpiId     String?  // Links to ApprovedKPI
  targetValue     String
  timeframe       String
  generatedPlan   Json     // Stores the 3x3 scenarios and Strategy Canvas
  status          String   @default("ACTIVE") // ACTIVE, ACHIEVED, ABANDONED
  createdAt       DateTime @default(now())
}
```

---

## 🚦 Final Output: The Strategy Canvas
The end result is a structured document for the user containing:
1.  **Restated Goal:** (e.g., "Revenue +20% in 90 days")
2.  **Top 3 Actions:** With confidence scores.
3.  **Execution Scenarios:** Lean / Balanced / Premium toggles.
4.  **Location Breakdown:** Specific strategies for different stores.
