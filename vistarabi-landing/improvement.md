# VistaraBI — Dashboard & Data Representation Improvement Plan
## Tailoring Advanced Analytics for Small-to-Medium Businesses (SMBs)

### 1. Introduction: The SMB Analytics Challenge
Small and medium-sized businesses operate in fast-paced environments with lean teams. They rarely have dedicated data engineering resources or business analysts. Consequently, a successful business intelligence platform must move beyond static reports and provide:
1. **Instant Actionability**: Auto-prioritizing which metrics require immediate attention.
2. **Flexible Semantics**: Adapting pre-built KPI formulas to specific business rules without coding.
3. **Interactive Simulation**: Allowing owners to test "What-If" business scenarios before making capital decisions.
4. **Data Integrity Transparency**: Showing how raw transactions are cleaned and aggregated into final metrics.

This document details critical issues in the current dashboard and outlines the technical roadmap to implement multi-level analysis, domain-specific refinements, and interface enhancements.

---

### 2. Dashboard UI/UX & Visual Representation Improvements

#### Issue: Static Layouts & Mobile View Constraints
Currently, dashboard layouts are pre-rendered into fixed sections and cards based on the domain blueprint. Under low-resolution screens or mobile devices (<768px), cards can feel crowded, and sidebars take up excessive space. Furthermore, cards are organized statically rather than dynamically sorting by performance urgency.

#### Proposed Refinements:
*   **Dynamic Cognitive Layout (Priority-Based Sorting)**:
    *   Integrate the `anomalySeverity` and `deltaPercent` values from the analytics engine directly into the dashboard layout manager.
    *   Automatically sort and promote cards with active anomalies or extreme delta shifts (e.g., a sudden 25% drop in SaaS MRR or a major spike in Healthcare no-shows) to a top-level **"Focus Area"** grid.
*   **CSS Container Queries & Responsive Refactoring**:
    *   Transition from rigid Tailwind grid break points to CSS Container Queries (`@container`). This allows metric cards to adjust their internal layouts (e.g., shifting from a horizontal strip to a vertical chart layout) based on the card’s container width, regardless of screen resolution.
*   **Interactive Custom Drag-and-Drop Layout Editor**:
    *   Implement `@hello-pangea/dnd` or `react-grid-layout` with persistence.
    *   Enable users to customize dashboard widgets, adjust chart sizes, and save custom configurations to the `DashboardConfig` table in Prisma.

---

### 3. Multi-Level Analysis & Dynamic Drill-Down (OLAP Slicing)

#### Issue: Linear Drill-Down Paths
Currently, the drill-down orchestrator (`drill-down-orchestrator.ts`) is limited to hardcoded paths (e.g., Category → Subcategory). Small business owners often need to slice-and-dice data along multiple dimensions simultaneously (e.g., viewing E-Commerce sales for a specific product, sold through social media advertising, to customers in the Northeast region).

#### Proposed Refinements:
*   **Virtual Client-Side OLAP Engine (DuckDB WASM)**:
    *   Integrate `DuckDB WASM` in the browser client.
    *   Instead of making repeated API calls to the server for each filter permutation, load the cleaned dataset once into client-side memory.
    *   Execute complex, multi-dimensional SQL aggregations locally in the browser in less than 5ms, enabling instantaneous cross-filtering.
*   **Multi-Dimensional Pivot Grid View**:
    *   Add a toggle to switch from chart visualizations to a pivot-table layout.
    *   Allow users to drag columns (e.g., Date, Region, Product, Customer Segment) to Rows and Columns to dynamically aggregate revenue, volume, or count metrics.

---

### 4. Domain Data Quality & Custom Definition Management

#### Issue: Rigid KPI Blueprint Definitions
The KPI rule registry (`kpi-rule-registry.ts`) defines metrics like "Active User" or "Customer Acquisition Cost (CAC)" statically. However, an EdTech platform might define an "Active Student" as someone who completed a quiz this week, whereas a SaaS company might define "Active User" as someone who logged in within the last 30 days.

#### Proposed Refinements:
*   **Semantic Custom Formula Editor**:
    *   Build a visual formula builder interface.
    *   Expose standard mathematical operators, columns, and aggregate functions, allowing users to compile customized KPIs (e.g., `Custom Retention = Active Users / Total Registrations`).
    *   Save these custom blueprints under the `ApprovedKPI` Prisma model and compile them to SQL via the existing SQL compiler.
*   **Purification & Clean-up Transparency Widget**:
    *   Add a **"Data Lineage & Cleaning Audit"** panel directly within the dashboard.
    *   Visualize the exact data pipeline: Raw Row Count → Imputed Nulls → Standardized Currencies / Dates → Outliers Removed → Final Computed Rows.
    *   Allow the user to toggle outlier removal parameters (e.g., adjusting the IQR multiplier from `1.5` to `2.0` or changing null imputation methods from mean to median) and immediately preview the changes on their charts.

---

### 5. Interactive "What-If" Scenario Simulation Sandbox

#### Issue: Asynchronous Monte Carlo Validation
While the Strategy Canvas in Module 8 calculates Monte Carlo probability graphs, the simulation is decoupled from the main dashboard workspace, limiting immediate visual feedback during day-to-day planning.

#### Proposed Refinements:
*   **Direct Dashboard Sliders (Interactive Playground)**:
    *   Add an interactive simulation overlay on forecasting charts.
    *   Provide simple sliders for business variables: **Pricing Adjustment (%)**, **Ad Spend Change ($)**, **Expected Conversion Shift (%)**, and **Expected Churn Shift (%)**.
*   **Sigmoid Ramp-up Projection Overlay**:
    *   Use the existing mathematical ramp-up functions (`calculateRampFactor` in `impact-model.ts`) client-side to compute projection trajectories.
    *   Display a dotted **"Simulated Future"** line overlaying the Prophet baseline forecast and actual history, providing the business owner with instant visual scenarios of their strategic ideas.

---

### 6. Outbound Alerting and Integration Pipelines

#### Issue: Passive Dashboard Design
SMB owners cannot monitor dashboards constantly. Active issues or anomalies can go unnoticed unless the user log in.

#### Proposed Refinements:
*   **Outbound Communication Channels**:
    *   Wire the dashboard's anomaly detection engine to the existing Resend email service and create a Slack/Teams webhook integration.
    *   Allow users to configure alerting thresholds (e.g., "Send Slack message if Revenue falls below 15% of the forecasted baseline").
*   **Operational Task Push (Write-Back)**:
    *   Add a **"Push to Action"** button to Goal and Strategy cards.
    *   Integrate with tools like Trello, Notion, or Jira.
    *   Allow owners to instantly export AI-generated strategic scenarios as actionable task lists in their project management software.
