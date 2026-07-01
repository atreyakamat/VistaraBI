# 🌉 The Context Bridge: Integrating Modules 6, 7, and 8

## The Core Problem
Currently, the AI in **Module 6 (Chat/Governance)** struggles to understand the context of what is happening in **Module 7 (Strategy)** and **Module 8 (Forecasting)**. 
If a user asks, *"Why did my strategy fail?"* or *"What should I do next?"*, the AI gives generic advice because it doesn't have real-time access to the exact mathematical output of Module 8 or the specific action items from Module 7.

## The Solution: The "State Injection Pipeline"
To make the AI truly "context-aware", we must stop treating the LLM as a standalone chatbot. Instead, the LLM must act as an **Interpreter of the System State**.

Every time a user sends a message to Module 6, the system must automatically invisibly append the active data from Modules 7 and 8 into the LLM's **System Prompt**.

### Architecture Flow
1. **Module 7 (Goal Engine):** Generates `[Strategy A, Strategy B]`.
2. **Module 8 (Validator):** Runs Monte Carlo, generates `Probability: 72%`.
3. **The Global Store:** Saves this output to a Zustand/Redux store or server-side session.
4. **Module 6 (AI Chat):** When the user types *"How does this look?"*, the API Route intercepts the request and injects a hidden context block.

---

## Technical Implementation Method

### 1. The Context Payload (What to Inject)
Create a standard JSON payload that represents the "Current Reality" of the user's dashboard.

```json
{
  "active_goal": "Increase MRR to $75,000 in 6 months",
  "planned_actions": ["Email Campaign (+10%)", "SEO Optimization (+5%)"],
  "module_8_forecast": {
    "probability_of_success": 5.5,
    "baseline_trajectory": "$63,100",
    "optimistic_trajectory": "$69,400",
    "critical_risk_factor": "Uplift is too low to close the gap."
  }
}
```

### 2. The Prompt Injection (API Route middleware)
In your Next.js API route for the Ollama/LLM chat (`/api/chat`), you dynamically build the system prompt before sending it to the model.

```typescript
// Example: src/app/api/chat/route.ts

const systemPrompt = `
You are VistaraBI, an expert business analyst. 
You are currently helping the user evaluate their strategy.

--- CURRENT SYSTEM CONTEXT (DO NOT REVEAL THE JSON TO THE USER) ---
${JSON.stringify(currentSystemState)}
--- END CONTEXT ---

Based on the probability of success (${currentSystemState.module_8_forecast.probability_of_success}%), 
advise the user on whether they should adjust their sliders, add a new action, or proceed.
`;
```

### 3. The Expected Result
Now, when the user opens the chat and says *"Is my email campaign enough?"*, the AI reads the injected context and replies:

> *"Based on the Module 8 simulation, your email campaign only brings you to $69,400, leaving you short of your $75,000 goal. The Monte Carlo simulation gives this only a 5.5% chance of success. I recommend adding a second action, like a targeted Ad campaign, or increasing your email ramp-up speed."*

---

## Next Steps for Development
1. **Establish a Unified State:** Use React Context or Zustand to hold the `StrategyCanvasResult` globally on the frontend.
2. **Modify the Chat API:** Update the `/api/chat` endpoint to accept an optional `systemContext` object from the frontend.
3. **Build the Split UI:** Present the Strategy Canvas alongside the AI Chat, so when the user moves a slider, the AI instantly knows the new probability. (Implemented in the new test page).
