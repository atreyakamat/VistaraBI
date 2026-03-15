# 📄 Module 9: Executive Board Report Engine (Architecture)

## 1. Executive Summary
The goal of Module 9 is to synthesize the entire VistaraBI workflow—from data ingestion (Module 1) through AI insight discovery (Module 6) and strategic decision simulation (Module 8)—into a highly polished, board-ready PDF Executive Report. 

Instead of forcing users to present screenshots of a dashboard, Module 9 autonomously compiles a strategic narrative: "Here is the data, here is the problem, here is our strategy, and here is the mathematical proof it will work."

---

## 2. Core Components

### A. The State Aggregator (The Collector)
Before generating a report, the system must collect the state from the active session.
*   **Data Profile:** Domain (e.g., E-commerce), primary KPI (e.g., Revenue), current value.
*   **AI Chat History:** The summarized conversation from Module 6 where the user discovered the core issue.
*   **Module 7 Goals:** The selected actionable goals and strategies.
*   **Module 8 Simulation Data:** The baseline forecast, the chosen scenario, probability of success, and Strategy Gap.

### B. The LLM Synthesizer (The Writer)
Raw data is not enough for an executive report. Module 9 utilizes the local Ollama LLM (`qwen3:0.6b` or `qwen3.5:397b-cloud`) to write the narrative.
*   **Input:** The aggregated JSON state from the Collector.
*   **Prompt:** *"You are an executive assistant. Write a 1-page summary of the current business state, the chosen strategy, and the expected simulated outcome. Use a professional, board-ready tone."*
*   **Output:** Structured Markdown/text that will form the body of the PDF.

### C. Visual Capture Engine (The Photographer)
Executive reports require charts. Because Recharts (used in Module 8) renders in the browser DOM, Module 9 requires a mechanism to capture these visualizations for the server-side PDF.
*   **Mechanism:** `html2canvas` (Client-side extraction) OR a headless browser like `Puppeteer` (Server-side rendering) to snap a high-fidelity image of the "Strategic Decision Canvas".

### D. The Document Generator (The Publisher)
*   **Technology:** `@react-pdf/renderer`
*   **Function:** Takes the LLM narrative, the metric data, and the captured chart images, and compiles them into a perfectly styled, paginated PDF document.

---

## 3. Data Flow

1.  **Trigger:** User clicks "Generate Executive Report" on the Module 8 dashboard.
2.  **Capture Phase (Client-side):** The UI takes a snapshot of the Strategy Canvas using `html2canvas` and converts it to a base64 image string.
3.  **Aggregation Phase:** The frontend bundles the base64 image, the Chat History, and the Simulation Context into a single payload.
4.  **Submission:** Payload is posted to `/api/v1/report/generate`.
5.  **Synthesis Phase (Server-side):** The API sends the text data to the Ollama LLM to generate the "Executive Summary" text.
6.  **Compilation Phase:** `React-PDF` renders the document stream in memory using the LLM text and the base64 image.
7.  **Delivery:** The API returns the PDF blob to the client, triggering an automatic download.

---

## 4. Why This Architecture?
*   **Separation of Concerns:** The LLM handles the prose, Prophet handles the math, and React-PDF handles the layout.
*   **Zero-Hallucination Visuals:** By capturing the actual Module 8 Recharts canvas rather than asking a plotting library to redraw it, we guarantee the PDF chart perfectly matches what the user saw and approved.
*   **Privacy-First:** By utilizing the existing local Ollama pipeline, sensitive business strategy data never leaves the VistaraBI environment.
