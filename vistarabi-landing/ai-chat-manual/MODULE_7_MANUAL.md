# Module 7: Goal Strategy Engine - Main Manual

## Overview
Module 7 is the prescriptive intelligence layer of the VistaraBI platform. While previous modules focused on understanding historical data, defining KPIs, building dashboards, and interacting with AI, Module 7 answers the ultimate business question: **"Given everything we know, what should we do next?"**

It transforms natural language business goals into highly structured, actionable execution strategies, bridging the gap between descriptive analytics and prescriptive action.

---

## The 7-Stage Pipeline

### Stage 1: Goal Parser
- **Function:** Interprets natural language queries (e.g., "Increase revenue by 15% next quarter").
- **Extraction:** Identifies the core `metric` (revenue), the `targetValue` (+15%), and the `timeframe` (next quarter).
- **Technology:** Uses intelligent regex patterns and AI-driven confirmation to ensure intent accuracy.

### Stage 2: KPI Mapping
- **Function:** Maps the parsed metric to validated KPIs from the Module 4 Blueprint.
- **Why it matters:** Ensures that strategies are grounded in strictly approved business logic (e.g., mapping "sales" to the official `kpi_revenue_total` formula) rather than loose estimations.

### Stage 3: Goal Decomposer
- **Function:** Breaks down the target KPI into contributing sub-factors.
- **Example:** If the goal is to increase Revenue, the decomposer uses the blueprint to determine that `Revenue = Order Volume × Average Order Value (AOV) × (1 - Discount Rate)`. It then calculates mathematical paths to achieve the overall goal.

### Stage 4: Strategy Generation
- **Function:** The AI brain of Module 7. It asks the local Ollama LLM to brainstorm domain-specific, context-aware strategies based on the decomposed factors.
- **Output:** A list of actionable items graded on potential effectiveness, domain fit, implementation cost, and speed to market.

### Stage 5: Strategy Ranking
- **Function:** Scores the generated strategies using a deterministic algorithm: `(Effectiveness × Domain Fit × Cost Efficiency × Speed) / 4`.
- **Result:** Filters the noise and surfaces the top 3 highest-confidence strategic actions.

### Stage 6: Scenario Builder
- **Function:** Takes the winning strategies and creates execution plans categorized by investment level.
- **Tiers:**
  - **Lean:** Bootstrapped, manual effort, low cost (typically < $500).
  - **Balanced:** Standard tools, moderate spend, balanced risk/reward.
  - **Premium:** Aggressive investment, agency partnerships, highly scalable.

### Stage 7: Location / Segment Splitter
- **Function:** Customizes the strategy based on the performance of different segments or geographic locations.
- **Application:** Applies aggressive growth tactics to high-performing regions while deploying conservative stabilization tactics to underperforming ones.

---

## User Interface & Workflow

Module 7 lives within the **Right Intelligence Sidebar** of the VistaraBI Dashboard. 

1. **Invoke the Panel:** Click the "Strategy" button on the floating action bar in the bottom right corner of your dashboard.
2. **Set a Goal:** Type a natural language goal into the input field. Examples:
   - "Reduce churn by 10% in 60 days"
   - "Increase AOV to $85 this quarter"
3. **Pipeline Execution:** Watch the animated UI progress through parsing, mapping, decomposing, generating, and scenario building.
4. **Review the Strategy Canvas:** The final output is the Strategy Canvas.
   - Read the decomposed mathematical factors.
   - Review the Top 3 strategic actions.
   - Toggle between Lean, Balanced, and Premium to evaluate resource allocation.
   - Check the location split recommendations.

---

## Error Handling & Fallbacks
Module 7 is designed to be highly resilient:
- If the AI API is temporarily unreachable or times out, the system automatically falls back to **rich, domain-specific strategy stubs**. 
- The user will never see a "broken" UI; they will always receive an actionable plan, even if it is generated via heuristic fallbacks rather than live AI synthesis.

---

## Developer Operations

### Running Tests
To ensure the mathematical models and ranking algorithms remain robust, a complete test suite is provided.
```bash
npx vitest run tests/module-7/pipeline.test.ts
```
The test suite ensures that metrics decompose accurately according to domain logic, and that strategies are mathematically ranked correctly without requiring live AI endpoints during CI/CD.

### API Endpoint
- **POST /api/projects/[id]/goals**
  - Payload: `{ rawQuery: "Increase sales..." }`
  - Returns: The complete `StrategyCanvas` object.
- **GET /api/projects/[id]/goals**
  - Returns: A history of all past goals generated for the current project.