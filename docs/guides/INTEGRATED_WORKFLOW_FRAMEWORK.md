# 🚀 VistaraBI: Integrated Decision Workflow Framework (Modules 5-8)

## 1. The Executive Pipeline
VistaraBI is designed to move a user seamlessly from **Data Exploration** to **Mathematical Decision Validation**. This is achieved by tightly orchestrating Modules 5 through 8 into a single, continuous user journey.

### The Pipeline Flow:
1. **Module 5 (Observation):** The user views the generated BI Dashboard. They see historical data and current KPI tracking.
2. **Module 6 (Inquiry/Governance):** The user asks the AI: *"Why is this KPI dropping?"* The AI analyzes the data, identifies root causes, and suggests improvements.
3. **Module 7 (Strategy):** The user agrees with the AI and sets a formal goal (e.g., "Increase Revenue by 20%"). Module 7 breaks this goal into actionable strategies (e.g., "Launch Email Campaign").
4. **Module 8 (Simulation/Validation):** The strategies are passed into the Monte Carlo + Prophet simulation engine. The system calculates the exact probability of success and outputs the "Strategy Canvas."
5. **Module 9 (Reporting):** The validated strategy is compiled into a Board-Ready Executive PDF.

---

## 2. Component Integration Map

### Module 5: Analytics & Dashboards
*   **Role:** The visual foundation.
*   **Outputs to Downstream:** Provides the `kpiHistory` (historical time-series data) and the `currentValue` of the active KPI to Modules 6 and 8.

### Module 6: AI Governance & Interaction
*   **Role:** The analytical brain and user interface.
*   **Inputs:** `DashboardState` (Mod 5), `SimulationContext` (Mod 8).
*   **Cloud API Readiness:** The system is architected to hot-swap local Ollama calls with high-parameter cloud models (e.g., Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, or Google Gemini) by injecting API Keys via environment variables (`CLAUDE_API_KEY`, `OPENAI_API_KEY`).
*   **Action:** Converts natural language questions into structured `Goal Intents`.

### Module 7: Goal Strategy Engine
*   **Role:** The operational planner.
*   **Inputs:** The `Goal Intent` determined by Module 6.
*   **Action:** Generates a structured array of `StrategicAction` objects:
    ```json
    { "name": "Email Campaign", "expectedUplift": 0.15, "rampDays": 30, "startDayOffset": 14 }
    ```

### Module 8: Predictive Strategy Validator
*   **Role:** The mathematical reality check.
*   **Inputs:** `kpiHistory` (from Mod 5) and `StrategicAction[]` (from Mod 7).
*   **Action:** Runs Prophet baseline + 1,000 Monte Carlo simulations.
*   **Output:** Returns `StrategyCanvasResult` (Probability of Success, Strategy Gap) which flows *back* into Module 6 to provide live context.

---

## 3. Data Handshake Schema
To ensure seamless integration, all modules must communicate using a unified Data Handshake.

```typescript
export interface VistaraSessionState {
  projectId: string;
  
  // Module 5 State
  activeKpi: {
    id: string;
    name: string;
    currentValue: number;
    history: KpiDataPoint[]; // Flows to Mod 8
  };

  // Module 6 State
  chatHistory: ChatMessage[];
  identifiedRisks: string[];

  // Module 7 State
  activeGoal: {
    targetValue: number;
    deadlineDays: number;
    actions: StrategicAction[]; // Flows to Mod 8
  };

  // Module 8 State
  simulationResult: StrategyCanvasResult | null; // Flows back to Mod 6 & Mod 9
}
```

---

## 4. Cloud AI Optimization (Future-Proofing)
While VistaraBI uses local Ollama for privacy, the integration framework is designed for Cloud API injection.

**Implementation Plan for Cloud Models:**
1. In `src/lib/module-6/llm-client.ts`, implement an adapter pattern.
2. If `process.env.ANTHROPIC_API_KEY` exists, bypass `callLocalModel` and route the prompt directly to Anthropic's cloud endpoint.
3. This is especially useful for **Module 9 (Report Generation)** and **Module 7 (Strategy Generation)**, which benefit significantly from the larger context windows (200k+ tokens) of cloud models.
