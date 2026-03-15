# 🌍 VistaraBI: Multi-Domain Optimization & Scaling Strategy

## 1. Objective
As VistaraBI expands, it must provide hyper-accurate, domain-specific insights. A SaaS company tracking *MRR* and *Churn* needs entirely different forecasting and AI reasoning than a Healthcare provider tracking *Patient Wait Times* and *Bed Occupancy*.

This document outlines the strategy to create automated scripts and test files for every major domain, ensuring the platform's reasoning engine (Modules 1-8) is optimized for all business types.

---

## 2. Supported Domains & Required Datasets

To truly optimize the platform, we will build a unified data generation suite. For each domain, we need a script that generates highly realistic, noisy, and trend-based data.

| Domain | Key KPIs to Simulate | Expected Data Quirks (Noise/Trends) |
| :--- | :--- | :--- |
| **SaaS / Tech** | MRR, Churn Rate, CAC, LTV | High end-of-month upgrade spikes, steady churn. |
| **E-Commerce** | AOV, Cart Abandonment, ROAS | Massive Q4/Black Friday seasonality, weekend dips. |
| **Healthcare** | Bed Occupancy, Wait Times, Readmission | Daily cyclical peaks, seasonal flu variations. |
| **Manufacturing** | Defect Rate, OEE, Supply Chain Lead Time | Flat trends punctuated by sudden machine failure spikes. |
| **EdTech** | Active Learners, Course Completion Rate | Semester-based seasonality, summer drop-offs. |
| **Finance** | NPL (Non-Performing Loans), Net Interest Margin | Macro-economic cyclic trends, tight variance. |

---

## 3. The "Domain Generator" Script Architecture

We will create a master script directory (`scripts/domain-generators/`) with the following architecture:

### A. The Schema Generator
For each domain, the script will output a multi-table CSV or JSON structure.
*Example: `generate_ecommerce.ts`* will create `orders.csv`, `customers.csv`, and `campaigns.csv`.

### B. The Forecasting Seed (For Module 8)
Each script will purposefully inject **hidden mathematical truths** that Module 8 (Prophet) must successfully discover:
*   *Hidden Truth 1:* "Every Friday, sales drop 15%."
*   *Hidden Truth 2:* "On day 120, a new ad campaign caused a permanent 10% uplift."

By knowing the mathematical truth of the generated data, we can test if the AI and Prophet models actually find it.

---

## 4. Automated Insight Testing Pipeline

Once the files are generated, we will build an evaluation runner (`test-domain-insights.ts`).

**How it will work:**
1. Ingest `dummy_healthcare_100k.csv` into Module 1.
2. Ensure Module 3 correctly tags it as `Healthcare`.
3. Ensure Module 4 automatically recommends `Bed Occupancy` as the primary KPI.
4. Run Module 8 and assert that it correctly identifies the seasonal flu spike.

---

## 5. Domain-Specific Prompt Tuning (Module 6)

The AI needs to speak the language of the domain.
*   **SaaS:** "Your MRR is at risk due to high churn."
*   **Manufacturing:** "Your OEE is dropping due to increased defect rates."

We will optimize the global AI Context Injector so that when `domain === 'manufacturing'`, the AI's system prompt gets loaded with a glossary of manufacturing terms.

---

## 6. Future Feature: The Executive Session Report (PDF)

*To be implemented in the next phase.*

After a user:
1. Uploads their domain data.
2. Chats with the AI to find insights.
3. Sets a Goal (Module 7).
4. Validates the strategy (Module 8).

The platform will generate a **Board-Ready PDF Report**.
This PDF will automatically compile:
*   The raw AI Chat summary (The "Why").
*   The Actionable Goals generated.
*   The Strategy Canvas chart and Monte Carlo probability (The "Proof").

### PDF Tech Stack Proposal (For Later):
*   **`react-pdf` / `jspdf`**: For generating server-side or client-side PDFs.
*   **Puppeteer / Playwright**: For taking high-fidelity screenshots of the Recharts Strategy Canvas to embed in the document.
*   **LLM Summarizer**: A final background prompt to summarize the entire session into a 1-page executive brief.
