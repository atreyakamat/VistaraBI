# 📊 Module 8: Strategy Canvas & Forecasting Engine
## Master Technical Specification (Predictive Strategy Validator)

This document defines the implementation for Module 8, transforming VistaraBI from a reporting tool into a **Decision Intelligence System**. It sits after Module 7 (Goal Strategy) to validate proposed actions against historical reality.

---

## 1. Executive Summary: The "Decision Validator"
Module 8 is the **Predictive Gatekeeper**. It consumes strategic intent from Module 7 and validates it using **Action-Aware Forecasting** and **Monte Carlo Simulations**.

**Core Value Proposition:**
It answers the question: *"If I do X, what is the scientific probability that I hit Y by date Z?"*

---

## 2. Role & Framing

### The "Predictive Reality Check"
*   **Upstream (Inputs):** Inherits cleaned historical KPIs (Module 2), domain constraints (Module 3), and Goal/Action pairings (Module 7).
*   **Downstream (Outputs):** Feeds the **Strategy Canvas Visualization** and provides risk metrics for **Module 6 (AI Governance)**.
*   **Mathematical Sovereignty:** Forecasting is handled by **Meta Prophet** and **Monte Carlo** simulations, not LLMs, ensuring reproducibility and accuracy.

---

## 3. Architecture & Components

### A. The Intelligence Pipeline
1.  **Data Quality Shield:** Validates history (90+ days) and generates a **Reliability Score**.
2.  **Action-Aware Prophet:** Baseline forecasting utilizing **External Regressors** (marketing spend, campaign toggles).
3.  **Dynamic Impact Modeling:** Applies non-linear **Sigmoid Ramp-up Curves** to Module 7 actions.
4.  **Monte Carlo Engine:** Simulates 1,000 "Possible Futures" to derive scientifically grounded success probabilities.
5.  **Interactive Strategy Canvas:** A real-time simulation dashboard with sliders for sensitivity analysis.

---


## 4. Technical Implementation Logic

### A. Non-Linear Impact Modeling (Sigmoid Curve)
Real-world impact follows an S-curve, not a flat step-function.

```typescript
// Logistic Sigmoid Function for smooth business ramp-up
export function calculateRampFactor(day: number, startDay: number, rampDays: number): number {
  if (day < startDay) return 0;
  if (day >= startDay + rampDays) return 1;
  
  const x = (day - (startDay + rampDays / 2)) / (rampDays / 6);
  return 1 / (1 + Math.exp(-x));
}
```

### B. Monte Carlo Simulation Engine
We replace "Point Estimation" with "Stochastic Simulation" to quantify uncertainty.

```typescript
export function runMonteCarlo(
  baseline: number[], 
  actions: StrategicAction[], 
  goal: number,
  iterations = 1000
): number {
  let successes = 0;
  for (let i = 0; i < iterations; i++) {
    const finalDayIndex = baseline.length - 1;
    let simulatedValue = baseline[finalDayIndex];

    // Sample Noise (Market Volatility +/- 5%)
    simulatedValue *= (1 + (Math.random() - 0.5) * 0.05);

    // Sample Execution Quality (70% to 110% of expected impact)
    actions.forEach(action => {
      const executionQuality = 0.7 + Math.random() * 0.4;
      simulatedValue *= (1 + (action.expectedUplift * executionQuality));
    });

    if (simulatedValue >= goal) successes++;
  }
  return successes / iterations;
}
```

---

## 5. Data Validation Layer (Guardrails)

| Check | Rule | Impact on Score |
| :--- | :--- | :--- |
| **History Depth** | < 90 Days | -40 Points (Fail) |
| **Data Gaps** | > 5% Missing | -20 Points |
| **Outlier Density**| > 10% Spikes | -15 Points |
| **Variability** | CV < 1% | -10 Points (Too flat to forecast) |

---

## 6. Strategy Canvas Visualization (UI/UX)

The Strategy Canvas is a **Simulator**, not a chart.

### Forecast Layers:
*   **Baseline (Solid Blue):** "Do Nothing" trajectory.
*   **Optimistic (Dotted Green):** Full strategy success.
*   **Conservative (Dotted Red):** Market headwinds / Failure to execute.
*   **The Cone of Uncertainty:** Shaded area representing 95% confidence intervals.

### Interactive Sliders:
*   **Launch Delay:** Slide to move `startDayOffset` and watch the probability gauge drop.
*   **Impact Intensity:** Adjust `expectedUplift` to see sensitivity.
*   **Risk Buffer:** Toggle `Market Volatility` settings.

---

## 7. API Specification

### POST `/api/v1/forecast/validate`
**Request:**
```json
{
  "uploadId": "uuid-123",
  "goalValue": 75000,
  "horizonDays": 180,
  "actions": [
    {
      "name": "Email Campaign",
      "expectedUplift": 0.10,
      "rampDays": 21,
      "startDayOffset": 14
    }
  ]
}
```

**Response:**
```json
{
  "probabilityOfSuccess": 0.72,
  "reliabilityScore": 94,
  "scenarios": {
    "baseline": 63100,
    "optimistic": 78200,
    "conservative": 58900
  },
  "sensitivity": {
    "primaryDriver": "Email Conversion",
    "criticalRisk": "Q4 Seasonality"
  }
}
```

---

## 8. Test Cases & Validation

### Unit Tests (Vitest)
1.  **`ramp-factor.test.ts`**: Verify Sigmoid output is 0 at start, ~0.5 at midpoint, and 1.0 at end.
2.  **`monte-carlo.test.ts`**: Verify that impossible goals return near 0% probability.
3.  **`validator.test.ts`**: Ensure reliability score correctly penalizes sparse data.

### Integration Tests
1.  **`module-7-to-8-bridge.test.ts`**: Verify Module 7 strategy objects are correctly parsed into Prophet regressors.
2.  **`canvas-payload.test.ts`**: Ensure the UI payload contains all necessary lines and confidence zones.

---

## 9. Implementation Checklist

- [ ] **Phase 1:** Install `prophet` (Python) or bridge to a Node-based forecaster.
- [ ] **Phase 2:** Implement `impact-model.ts` (S-Curve logic).
- [ ] **Phase 3:** Implement `monte-carlo.ts` (1,000 iteration engine).
- [ ] **Phase 4:** Build the `StrategyCanvas` component in Next.js.
- [ ] **Phase 5:** Connect Module 7 "Apply Strategy" button to Module 8 "Validation Engine."

---
*Document Version: 1.0 (Fusion)*  
*Status: Ready for Implementation*
