# PRD: Multi-Domain Data Generation Suite & Insight Validation

## 1. Goal
Create an automated test data generation suite that outputs highly realistic, domain-specific CSV datasets (SaaS, Healthcare, E-commerce, Manufacturing). This data will be used to test VistaraBI's AI (Module 6) and Strategic Decision Simulator (Module 8).

## 2. Epics & Features

### Epic 1: Domain-Specific Data Generators
We need script-based data generators for key business domains. The generated data must contain injected mathematical "truths" (e.g., specific seasonal trends, noise levels, and anomalies) that our AI pipeline is expected to discover.

*   **Story 1.1: E-commerce Generator**
    *   **Requirements:** Generate `ecommerce_orders.csv` with a weekly cycle (sales drop on weekends) and a massive Q4 (Black Friday) spike. 
    *   **Acceptance Criteria:** Script outputs a valid CSV spanning 365 days. The CSV has an exact mathematically verifiable +40% increase in November.
*   **Story 1.2: SaaS Generator**
    *   **Requirements:** Generate `saas_mrr.csv` tracking MRR, Churn, and CAC. Inject an end-of-month upgrade spike and a steady churn rate.
    *   **Acceptance Criteria:** Outputs 365 days of data. MRR strictly increases but dips exactly on day 200 (simulating a churn event).
*   **Story 1.3: Healthcare Generator**
    *   **Requirements:** Generate `healthcare_capacity.csv` tracking Bed Occupancy and Wait Times. Include daily cyclical peaks and a winter flu variant.
    *   **Acceptance Criteria:** Outputs realistic numeric counts. Winter months must reflect a 25% sustained increase in bed occupancy.

### Epic 2: Automated Insight Pipeline Testing
Create a test suite that ingests these generated files and verifies that the VistaraBI AI modules correctly interpret the domain and forecast the data.

*   **Story 2.1: Domain Detection Test**
    *   **Requirements:** Write a Vitest suite that feeds the generated CSVs into Module 3.
    *   **Acceptance Criteria:** `ecommerce_orders.csv` strictly evaluates to Domain: `E-commerce`. `saas_mrr.csv` evaluates to `SaaS`.
*   **Story 2.2: Prophet Pattern Recognition Test**
    *   **Requirements:** Feed the E-commerce data into Module 8's Prophet engine.
    *   **Acceptance Criteria:** The Prophet model's `yearly_seasonality` component successfully isolates the November spike created in Story 1.1.

## 3. Technical Constraints
*   Language: TypeScript/Node.js (for generators and tests)
*   Testing Framework: Vitest
*   Data Format: Output must be standard CSV formatted using `papaparse` to mimic a user upload.
*   Location: Generators must reside in `scripts/domain-generators/`.

## 4. Dependencies
*   Requires the existing `src/lib/module-8/prophet-bridge.ts` to be fully operational for Epic 2.
*   Requires `faker` or similar randomized data seeding for realistic generation.
