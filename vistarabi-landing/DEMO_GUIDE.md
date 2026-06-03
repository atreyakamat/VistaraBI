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
- **Visuals:** View the dynamically generated Plotly charts.
- **Live Filtering:** Use the date-range and category filters to see the dashboard recalculate in sub-seconds.

### 5. Conversational Exploration (Module 6)
- **Tool:** Ask the "Ask AI" assistant questions like:
  - *"Which product category has the highest growth?"*
  - *"What is our Average Order Value trend?"*
- **Cloud vs Local:** 
  - **Cloud (Groq):** Used for generating the SQL and high-level reasoning.
  - **Local (Ollama):** Used if your internet is disconnected or if Groq hits a rate limit.

### 6. Goal Strategy & Simulation (Module 7 & 8)
- **Input:** State a business goal, such as *"Increase AOV by 30% by Q4"*.
- **Full-Screen Simulator:** Click **"Simulate Strategy"** to open the new cockpit.
- **Forecast:** The system runs a **Prophet + Monte Carlo** simulation to show the success probability.
- **Overlay:** Use the "X" in the top right to return to the dashboard.

### 7. Executive Reporting (Module 9)
- **Action:** Click "Export Executive Report".
- **Result:** The system generates a multi-page PDF combining AI insights, charts, and data health summaries.
- **Verification:** Ensure the `VistaraBI_ECOMMERCE_SPECIAL_Strategic_Report.pdf` includes the "Target KPI Selected" and "Forecasted Trendline".

---

## 🛡 Security & Privacy
- VistaraBI is now **100% Open Source and Free**.
- All Stripe/Billing modules have been removed.
- Data is processed locally or via secure Cloud AI endpoints (Groq).

**Babul Babu ji, your platform is now ready for the world!** 🌟
