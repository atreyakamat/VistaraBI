# VistaraBI Report Generation Guide

This guide ensures you can successfully generate and download professional Strategic Intelligence Reports from the VistaraBI platform.

## 📋 Prerequisites for a Successful Report

To generate a full 4-page report with all metrics and charts, the following conditions must be met:

1.  **Active Project:** You must be inside a project with uploaded and purified data.
2.  **KPIs Discovered:** The "KPI Discovery" phase (Module 4) must be completed so the dashboard has active cards.
3.  **Strategy Simulation Run:**
    *   Open the **"Target Goals"** panel.
    *   Enter a business goal (e.g., "Increase Revenue by 20%").
    *   Click **"Simulate Strategy"**.
    *   Wait for the **Forecasting Matrix** and **AI Chat** to load.
    *   *Note:* The report uses the data from the active simulation to populate the forecast trendlines and scenarios.

---

## 🛠 Step-by-Step Execution

### Step 1: Initialize the Analytics Environment
Ensure your local server is running and you are logged in.
- **URL:** `http://localhost:3005`
- **Login:** `demo@vistarabi.com` / `VistaraDemo@2026`

### Step 2: Navigate to a Project
Select an existing project (like the "Ecommerce Special") from your dashboard.

### Step 3: Trigger the Strategy Engine
Click the **"Strategy"** FAB (Floating Action Button) or the **"Target Goals"** sidebar link.
- Enter your goal in the text area.
- Click **"Generate Strategy"**.
- Once the "Top Recommended Strategies" appear, click **"Simulate Strategy"** on any of the action cards.

### Step 4: Verify the Simulation
Wait for the full-screen cockpit to open. You should see:
- A large chart with historical data and dotted forecast lines.
- AI Chat panels on the right.
- Success probability metrics (e.g., 85.0%).

### Step 5: Export the Report
In the top-right corner of the **Strategy Simulator Overlay**, click the **"Export Executive Report"** button.
- A loading spinner will appear on the button ("Generating PDF...").
- The system is now aggregating data from all 9 modules and calling the Groq AI for the executive summary.
- The download should start automatically within 3–8 seconds.

---

## 🔍 Troubleshooting "Failed to generate report"

If the report generation fails, check the following:

1.  **AI Connectivity:** The report requires an LLM to write the summary. Ensure your **Groq API Key** is active or that your local **Ollama** is running.
2.  **Missing Metrics:** If you haven't clicked "Simulate Strategy", some metrics (like the growth gap) will be missing. The system now has fallbacks, but a simulation provides the best results.
3.  **Large Image Capture:** If your browser blocks popups or has very low memory, the "html2canvas" capture might fail. The platform will automatically use a placeholder image in this case to prevent a crash.
4.  **Database Connection:** Ensure PostgreSQL is running. The report generator fetches the list of uploaded datasets to include in the "Data Health" section.

---

## ✅ Success Indicators
A perfect report will contain:
- **Page 1:** Executive Summary, Domain Badge, and 4 KPI Cards.
- **Page 2:** Chat Transcript (Log of your questions to the AI).
- **Page 3:** Predictive Forecast Chart and Success Metrics.
- **Page 4:** Strategy Decomposition, Budget Scenarios, and Location Splits.

**Babul Babu ji, follow these steps and your Strategic Report will be flawless!** 🚀
