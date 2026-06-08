# VistaraBI - Professional Demo Guide

This guide provides the necessary settings and steps to demonstrate the VistaraBI platform, from data ingestion to predictive strategy reporting.

## 🚀 Demo Environment Settings
- **Port:** `3005` (Local Development Server)
- **Login Credentials:**
  - **Email:** `demo@vistarabi.com`
  - **Password:** `VistaraDemo@2026`
- **Primary AI Provider:** Groq Cloud (`llama-3.3-70b-versatile`)
- **Fallback AI Provider:** Ollama Local (`qwen3.5:0.8b`)

---

## 🛠 Step-by-Step Demo Flow

### 1. Data Ingestion (Module 1 & 2)
- **Action:** Go to "New Project" and upload your CSV files.
- **Dataset:** Use the files in `vistarabi-landing/somedataset/` (e.g., `ecommerce_dataset_1.csv`).
- **Optimization:** The system automatically slices large files for fast demo processing while maintaining statistical accuracy.
- **Verification:** Watch the "Data Purification" summary show how nulls and duplicates are handled.

### 2. Domain Intelligence (Module 3)
- **Setting:** VistaraBI uses **Cloud AI (Groq)** to semantically analyze your column headers.
- **Automatic Detection:** The system will identify the data as `ECOMMERCE` or `SERVICES` automatically.
- **Manual Lock:** You can manually lock the domain in the "Settings" tab of the project.

### 3. KPI Discovery (Module 4)
- **Automatic Mapping:** The system automatically maps your raw data columns to industry-standard KPIs (e.g., *Average Order Value*, *Conversion Rate*).
- **Blueprint Finalization:** Confirm the discovered KPIs to move to the dashboard.

### 4. Interactive Dashboards (Module 5)
- **Visuals:** View the dynamically generated Plotly charts in the **"Executive Overview"** grid.
- **Full Report Export:** Notice the new **"Export Executive Report"** button next to the filters.
  - This button now captures the *entire dashboard state*, including all active KPI cards and any exploratory chat history, using high-fidelity `html2canvas` rendering.
- **Live Filtering:** Use the date-range and category filters to see the dashboard recalculate in sub-seconds.

### 5. Conversational Exploration (Module 6)
- **Tool:** Ask the "Ask AI" assistant questions like:
  - *"Analyze our Average Order Value trend."* (Expect: Analysis of stability/volatility)
  - *"What is the Average Order Value?"* (Expect: Current value calculation, e.g., $109.11)
  - *"Compare performance of marketing channels."* (Expect: Cross-metric comparison)
- **Insight:** Observe how Groq translates these into SQL and provides sub-second reasoning.
- **Cloud vs Local:** 
  - **Cloud (Groq):** Primary engine for high-level reasoning.
  - **Local (Ollama):** Reliable fallback.

### 6. Goal Strategy & Simulation (Module 7 & 8)
- **Input:** State a business goal, such as *"Increase AOV by 30% by Q4"*.
- **Full-Screen Simulator:** Click **"Simulate Strategy"** to open the new cockpit.
- **Forecast:** The system runs a **Prophet + Monte Carlo** simulation to show the success probability.
- **Overlay:** Use the "X" in the top right to return to the dashboard.
### 7. Executive Reporting (Module 9)
- **Goal:** Export a professional, multi-page strategic intelligence document.
- **Action:** Click **"Export Executive Report"** in the top-right corner of the Simulator Overlay.
- **Verification:** 
  - Ensure the download starts automatically.
  - Open the PDF and verify it contains the **Executive Summary**, **Target KPI**, and **Forecasted Trendlines**.
- **Pro-Tip:** The report uses the data from the **active simulation**. Always run "Simulate Strategy" first for the most detailed report.

---

## 🛡 Security & Privacy
- VistaraBI is now **100% Open Source and Free**.
- All Stripe/Billing modules have been removed.
- Data is processed locally or via secure Cloud AI endpoints (Groq).

---

## 🔍 Troubleshooting the Demo
- **Report Generation fails:** Ensure Groq API is active (for AI summary) and that "Simulate Strategy" was clicked to provide forecast data.
- **AI is slow:** Switch between "Cloud" and "Local" in the panel header to test fallback latency.

**Babul Babu ji, your platform is now ready for the world!** 🌟

