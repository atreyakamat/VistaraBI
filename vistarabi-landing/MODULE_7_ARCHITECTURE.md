# Module 7: Goal Engine Architecture & Implementation Plan

## Overview & Purpose
Module 7 translates high-level business goals (e.g., "I want to grow revenue 20% this quarter") into actionable, data-backed execution plans. It bridges the gap between descriptive analytics (what happened) and prescriptive analytics (what should we do).

By leveraging historical data, domain context, and local AI (Ollama), Module 7 provides a precise roadmap with execution strategies, budget scenarios, and confidence scores.

---

## 🏗️ System Architecture

The Goal Engine is composed of 6 core components operating in a linear pipeline.

```text
┌──────────────────────────────────────────────────────────┐ 
│              Module 7: Goal Engine                       │ 
│                                                          │ 
│  INPUT: User goal + Domain + Historical data            │ 
│                                                          │ 
│  Component 1: Goal Parser                              │ 
│    • Extract: metric, target, timeframe               │ 
│    • Technology: Regex + Ollama confirmation          │ 
│                                                          │ 
│  Component 2: Goal Decomposer                          │ 
│    • Break goal into sub-KPIs                         │ 
│    • Calculate required changes                        │ 
│    • Technology: Math formulas (domain-specific)       │ 
│                                                          │ 
│  Component 3: Action Generator (Ollama)               │ 
│    • Generate 10 creative actions with metadata       │ 
│    • Return: name, effectiveness, domain_fit, cost    │ 
│    • Technology: Ollama                               │ 
│                                                          │ 
│  Component 4: Action Ranker                            │ 
│    • Score each action: (Eff×DomFit×Cost×Speed)/4   │ 
│    • Select top 3 actions                             │ 
│    • Technology: Math scoring formula                  │ 
│                                                          │ 
│  Component 5: Scenario Builder (Ollama)               │ 
│    • Generate 3 execution plans per action            │ 
│    • Budget: Low ($), Medium ($$), High ($$$)        │ 
│    • Technology: Ollama for detailed planning         │ 
│                                                          │ 
│  Component 6: Location Splitter                        │ 
│    • If multi-store: Break goal per location         │ 
│    • Customize actions by store performance           │ 
│    • Technology: SQL grouping + logic                 │ 
│                                                          │ 
│  OUTPUT: 3 actions × 3 scenarios, by location, with   │ 
│          confidence scores and execution plans         │ 
└──────────────────────────────────────────────────────────┘
```

---

## 💻 Backend Implementation Breakdown

To ensure a smooth, error-free implementation, the backend will be broken down into discrete files under `src/lib/module-7/`.

### 1. `goal-parser.ts`
*   **Purpose:** Takes the raw natural language string and extracts structured parameters.
*   **Input:** `"Increase sales by 15% next month"`
*   **Output:** `{ targetMetric: "sales", targetValue: "+15%", timeframe: "next month", kpiId: "..." }`
*   **Logic:** Uses regex for quick hits, falling back to a lightweight Ollama prompt to map the natural language metric to an existing approved KPI from Module 4.

### 2. `goal-decomposer.ts`
*   **Purpose:** Breaks the main goal into contributing factors based on the Domain.
*   **Example:** If Goal = Increase Revenue (E-Commerce), Decomposer splits it into:
    *   Increase Traffic
    *   Increase Conversion Rate
    *   Increase Average Order Value (AOV)
*   **Logic:** Uses domain-specific mathematical models to determine how much each sub-KPI needs to change to hit the master goal.

### 3. `action-generator.ts`
*   **Purpose:** Brainstorms raw ideas.
*   **Input:** Goal context, Domain, and decomposed sub-KPIs.
*   **Output:** An array of 10 structured JSON actions.
*   **Prompt Strategy:** Forces Ollama to return strictly formatted JSON with fields: `actionName`, `estimatedEffectiveness` (1-10), `domainFit` (1-10), `costToImplement` (1-10), and `speedToMarket` (1-10).

### 4. `action-ranker.ts`
*   **Purpose:** Filters the brainstorming down to reality.
*   **Logic:** A deterministic mathematical function that calculates an aggregate confidence score for each action generated in step 3.
*   **Formula:** `Score = (Effectiveness × DomainFit × Cost × Speed) / 4`
*   **Output:** Selects the top 3 highest-scoring actions.

### 5. `scenario-builder.ts`
*   **Purpose:** Takes the top 3 actions and builds out concrete execution plans based on budget.
*   **Logic:** Prompts Ollama with the specific action and asks for three variants:
    *   **Low Budget ($):** Bootstrapped, manual effort.
    *   **Medium Budget ($$):** Software tools, light ad spend.
    *   **High Budget ($$$):** Agency hiring, massive ad spend, deep integrations.

### 6. `location-splitter.ts` (Optional/Contextual)
*   **Purpose:** Handles businesses with physical locations (Retail, Manufacturing, Healthcare).
*   **Logic:** Detects if the dataset has a "Location" or "Store" dimension. If so, it adjusts the goal proportionately based on historical performance (e.g., asking an underperforming store to grow 25% while a mature store grows 5%).

### API Endpoint (`src/app/api/projects/[id]/goals/route.ts`)
*   A dedicated POST endpoint that strings these 6 components together in a pipeline pattern and streams or returns the final structured roadmap to the frontend.

---

## 🖥️ Frontend Implementation Breakdown

The user interface must be clean, conversational, and deeply integrated into the dashboard.

### 1. Goal Input Interface (`GoalInputBar.tsx`)
*   **Location:** Integrated into the "Ask AI" section of the dashboard.
*   **Design:** A prominent text input bar, distinct from the standard Q&A chat. It should have a placeholder like: *"What is your primary goal for this quarter? (e.g., 'Reduce churn by 5%')"*
*   **Interaction:** When a user submits a goal, it shows a multi-step loading state corresponding to the backend pipeline (e.g., *"Parsing Goal..."* -> *"Analyzing Data..."* -> *"Generating Strategies..."*).

### 2. Goal Roadmap View (`GoalRoadmap.tsx`)
*   **Layout:** Once the AI finishes processing, the UI should present a structured dashboard overlay or dedicated tab.
*   **Components:**
    *   **Header:** Restates the goal clearly (e.g., "Target: 20% Revenue Growth by Q4").
    *   **Sub-KPI Breakdown:** Visual indicators showing what underlying metrics need to move to achieve the goal.
    *   **Strategy Columns:** 3 columns representing the Top 3 Ranked Actions.
    *   **Budget Toggles:** Inside each Strategy column, a toggle (Low / Medium / High) that flips the execution details based on the output of the Scenario Builder.
    *   **Location Tabs (if applicable):** A sidebar or dropdown to switch the view between different store locations.

---

## 🗄️ Database Updates Required

To make goals trackable over time, we will need to update `prisma/schema.prisma` before implementation:

```prisma
model ProjectGoal {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  rawQuery        String
  targetKpiId     String?  // Links to ApprovedKPI
  targetValue     String
  timeframe       String
  generatedPlan   Json     // Stores the 3x3 scenarios and actions
  status          String   @default("ACTIVE") // ACTIVE, ACHIEVED, ABANDONED
  createdAt       DateTime @default(now())
}
```

---

## 🚦 Execution Plan (How to build this next)

When ready to implement, we will follow these strict steps:

1.  **Phase 1 (DB & Stubs):** Update Prisma schema, run migrations, and create the empty skeleton files in `src/lib/module-7`.
2.  **Phase 2 (The Math & Parsing):** Implement `goal-parser.ts`, `goal-decomposer.ts`, and `action-ranker.ts`. Write unit tests for these deterministic functions.
3.  **Phase 3 (The AI):** Implement `action-generator.ts` and `scenario-builder.ts` with strict JSON-schema Ollama prompting.
4.  **Phase 4 (The API):** Build the `route.ts` endpoint that connects Phases 2 and 3 into a single pipeline.
5.  **Phase 5 (Frontend):** Build the `GoalInputBar` and the `GoalRoadmap` components in React.
