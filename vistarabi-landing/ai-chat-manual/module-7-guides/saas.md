# SaaS Guide for Module 7: Goal Strategy Engine

## 1. Introduction to Prescriptive SaaS
In Software as a Service (SaaS), recurring revenue is the lifeblood of the business. VistaraBI's Module 7 moves SaaS operators beyond basic MRR dashboards, offering highly specific, prescriptive playbooks to drive acquisition, force expansion, and plug churn leaks before they impact the bottom line.

## 2. Core SaaS Mechanics in Module 7
The Goal Decomposer understands the complex SaaS growth engine:
**Net Revenue Retention (NRR) = (Starting MRR + Expansion MRR - Downgrade MRR - Churn MRR) / Starting MRR**

If a founder sets a goal like "Increase NRR to 120%", Module 7 mathematically decomposes this to show the paths of least resistance:
- Driving Expansion MRR (Upsells, cross-sells, seat additions) OR
- Plugging Churn MRR (Improving onboarding, feature adoption).

## 3. Top SaaS Use Cases & Prompts
Effective natural language goals for SaaS in Module 7:

*   "Increase Net Revenue Retention (NRR) to 120% this year."
*   "Reduce logo churn by 5% this quarter."
*   "Increase Trial-to-Paid conversion rate by 15%."
*   "Boost expansion MRR by $10k this month."
*   "Reduce Customer Acquisition Cost (CAC) payback period to 6 months."

## 4. Deep Dive: A Strategy Canvas Example
Let's analyze the input: **"Increase Trial-to-Paid conversion rate by 15%."**

### Stage 1 & 2: Parsing and Mapping
The engine maps "Trial-to-Paid conversion rate" to the blueprint KPI: `saas-trial-conv`.

### Stage 3: Decomposing
To increase this conversion, the engine highlights contributing factors:
- Increasing the "Aha! Moment" activation rate during the first 3 days.
- Increasing product usage frequency during the 14-day trial.
- Optimizing the paywall friction point.

### Stages 4 & 5: Generation and Ranking
The AI, tuned for product-led growth (PLG), generates and ranks strategies:
1.  **In-App Guided Onboarding Tours (Confidence: 95%)**
2.  **Usage-Triggered Email Drip Campaigns (Confidence: 89%)**
3.  **Concierge Onboarding for High-Intent Signups (Confidence: 84%)**

### Stage 6: The Scenarios (Execution Plans)
For "In-App Guided Onboarding Tours," Module 7 builds three tiers:

**LEAN (Low Budget, DIY):**
- *Plan:* Hardcode a simple Javascript modal that pops up on first login, pointing the user to the 3 most important features required for activation.
- *Timeline:* 3-5 days.
- *Expected Impact:* 2-5% conversion lift.

**BALANCED (Standard Tools):**
- *Plan:* Integrate a third-party digital adoption platform (like Appcues, Userflow, or Pendo). Build customized, no-code walkthroughs tailored to the user's selected role during signup.
- *Timeline:* 2-3 weeks.
- *Expected Impact:* 7-12% conversion lift.

**PREMIUM (High Investment):**
- *Plan:* Re-engineer the core product onboarding experience. Implement an AI-driven setup wizard that automatically provisions the account with personalized template data based on the user's firmographic profile via Clearbit/ZoomInfo.
- *Timeline:* 2-4 months.
- *Expected Impact:* 15-20%+ conversion lift.

### Stage 7: Location & Segment Split
- *Enterprise Trials (High LTV):* Deploy Concierge Onboarding (human touch).
- *SMB/Self-Serve Trials (Low LTV):* Deploy Balanced automated in-app tours.

## 5. Domain-Specific AI Considerations
The AI evaluates strategies with an understanding of SaaS unit economics:
- **LTV:CAC Ratio:** Refusing to suggest acquisition strategies where CAC exceeds LTV.
- **PLG vs Sales-Led:** Tailoring advice based on whether the product is self-serve or requires enterprise sales.
- **Time-to-Value (TTV):** Prioritizing strategies that reduce the time it takes a user to get value.

## 6. Daily Operations
1. **Cohort Analysis:** Use Module 5 to identify a recent signup cohort with lagging activation.
2. **Strategy Generation:** Use Module 7 to ask: "Improve activation for the March cohort."
3. **Execution Execution:** Pass the generated 'Balanced' strategy to the Product/Growth team for the next sprint.

## 7. Conclusion
Module 7 serves as an automated Head of Growth, analyzing product usage and revenue data to generate the exact tactical plays needed to scale SaaS revenue predictably.