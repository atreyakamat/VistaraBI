# Finance Guide for Module 7: Goal Strategy Engine

## 1. Introduction to Prescriptive Finance
In the Financial Services sector, precision and risk management are paramount. VistaraBI's Module 7 shifts financial analytics from passive reporting to active, risk-adjusted strategy generation. Whether you are managing AUM (Assets Under Management), loan portfolios, or retail banking products, Module 7 provides structured, compliant pathways to reach your targets.

## 2. Core Finance Mechanics in Module 7
The Goal Decomposer understands complex financial formulas:
**Net Interest Margin (NIM) = (Investment Returns - Interest Expenses) / Average Earning Assets**

If a bank sets a goal like "Increase NIM by 50 basis points", Module 7 mathematically decomposes this to show paths like:
- Shifting asset mix toward higher-yield loans AND
- Reducing the cost of funds by aggressively promoting low-cost deposits (checking accounts).

## 3. Top Finance Use Cases & Prompts
Effective natural language goals for Finance in Module 7:

*   "Increase total AUM by 15% this fiscal year."
*   "Reduce non-performing loan (NPL) ratio by 2% next quarter."
*   "Grow retail deposit base by $50M in 6 months."
*   "Increase credit card activation rate by 10%."
*   "Reduce average customer onboarding time by 3 days."

## 4. Deep Dive: A Strategy Canvas Example
Let's analyze the input: **"Reduce non-performing loan (NPL) ratio by 2% next quarter."**

### Stage 1 & 2: Parsing and Mapping
The engine maps "non-performing loan ratio" to the blueprint KPI: `fin-npl-ratio`.

### Stage 3: Decomposing
To reduce the NPL ratio, the engine highlights contributing factors:
- Enhancing early-stage delinquency interventions.
- Tightening initial credit underwriting standards.
- Accelerating the restructuring of existing distressed loans.

### Stages 4 & 5: Generation and Ranking
The AI, configured for strict financial compliance, generates and ranks strategies:
1.  **Predictive Early Warning System for Delinquency (Confidence: 91%)**
2.  **Automated Hardship Restructuring Offers (Confidence: 86%)**
3.  **Enhanced Stricter Underwriting Filters (Confidence: 80%)**

### Stage 6: The Scenarios (Execution Plans)
For the "Early Warning System," Module 7 builds three tiers:

**LEAN (Low Budget, DIY):**
- *Plan:* Set up a weekly SQL script to flag accounts that have dropped in credit score or missed an external payment. Have the collections team manually call these accounts *before* they miss your payment.
- *Timeline:* 1-2 weeks.
- *Expected Impact:* 0.5% NPL reduction.

**BALANCED (Standard Tools):**
- *Plan:* Integrate a basic machine learning scoring model (using existing CRM tools) to automatically send SMS/email reminders and budget planning tools to "at-risk" segments 5 days before payment is due.
- *Timeline:* 4-6 weeks.
- *Expected Impact:* 1-1.5% NPL reduction.

**PREMIUM (High Investment):**
- *Plan:* Deploy an enterprise-grade AI risk decisioning platform (e.g., Zest AI). Automatically adjust credit limits in real-time and offer proactive, personalized restructuring terms directly in the mobile banking app.
- *Timeline:* 3-6 months.
- *Expected Impact:* 2%+ NPL reduction.

### Stage 7: Location & Segment Split
- *Commercial Loans (High Value):* Deploy the Premium predictive platform to protect large assets.
- *Retail Auto Loans (High Volume, Low Margin):* Deploy the Balanced automated SMS strategy.

## 5. Domain-Specific AI Considerations
The AI evaluates strategies with an understanding of financial constraints:
- **Regulatory Compliance:** Avoiding discriminatory lending practices (e.g., Fair Lending laws).
- **Risk vs. Reward:** Ensuring that aggressive growth strategies don't unacceptably increase portfolio risk.
- **Market Conditions:** Factoring in interest rate environments when suggesting loan growth strategies.

## 6. Daily Operations
1. **Risk Review:** Use Module 5 to identify loan cohorts with rising delinquency trends.
2. **Strategy Generation:** Use Module 7 to ask for strategies to "Stabilize Cohort X default rate."
3. **Execution Execution:** Route the generated strategies to the Risk Management committee for immediate action.

## 7. Conclusion
Module 7 allows financial institutions to dynamically balance growth and risk, turning compliance-heavy data into agile, executable business strategies.