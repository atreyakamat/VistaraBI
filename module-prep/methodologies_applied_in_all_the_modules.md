# Methodologies Applied in All the Modules

## Module 1: Data Ingestion and Project Management
**Methodology:** Multi-format Data Normalization and Schema Inference
The system programmatically ingests unstructured and structured data (CSV, Excel, JSON, XML) via dedicated parsers located in `src/lib/parsers/`. It employs format-specific algorithms to infer schema structure, detect data types, and normalize nested representations (e.g., flattening JSON objects). This deterministic approach ensures high-fidelity data extraction into standard rectangular structures while discarding formatting noise, generating a traceable audit log of all ingestion activities.

## Module 2: Data Cleaning and Quality Management
**Methodology:** Statistical Imputation and Anomaly Detection
Implemented in `src/lib/quality/` and `src/lib/purification/`, this module addresses data inconsistencies using robust mathematical functions. It employs the Interquartile Range (IQR) and Z-score methods (visible in `outlier-detector.ts`) to programmatically isolate statistical outliers without destructive deletion. Missing values are algorithmically imputed using median, mode, or forward-fill heuristics. Data health is quantitatively scored based on completeness, uniqueness, and validity.

## Module 3: Domain Detection and Classification
**Methodology:** Hybrid Rule-Based and AI-Powered Semantic Classification
The system utilizes a dual-engine classification strategy to determine the business sector (e.g., SaaS, Retail). Deterministically located in `src/lib/domain/`, it first evaluates dataset column signatures against a pre-compiled weighted heuristic library. If the confidence score falls below strict thresholds, it dynamically routes the schema to an LLM (Qwen3:0.6b via `src/lib/ai/`) to perform deep semantic inference based on raw data sampling, yielding an exact, contextualized domain match.

## Module 4: KPI Identification, Mapping, and Intelligent Generation
**Methodology:** Contextual Metric Extraction and LLM-derived Feasibility Matching
Handled by `src/lib/kpi/`, the system maps the inferred data schema against domain-specific key performance indicator repositories. It deterministically calculates the feasibility of standard metrics (e.g., Conversion Rate, MRR) by verifying requisite structural completeness. For unmapped or proprietary columns, it invokes the Ollama LLM to synthesize novel, mathematically sound KPI formulas dynamically, exposing deep, previously hidden analytical value specific to the user’s dataset.

## Module 5: Dashboard Generation
**Methodology:** Rules-based Visual Mapping and Component Orchestration
Located inside `components/dashboard/` and `src/lib/visualization/`, this module converts quantitative KPI outputs into professional visualizations. It implements a deterministic logic tree that evaluates data characteristics (cardinality, temporal flow, distribution, relativity). Depending on these properties, the framework algorithmically selects the optimal Plotly chart structure—ranging from single metric cards for scalar values to time-series line charts and multi-dimensional treemaps.

## Module 6: Natural Language Exploration (AI Chat Interface)
**Methodology:** Intent Classification, Entity Resolution, and NL2SQL Generation
Powered by `src/lib/module-6/` and `unified-ai-client.ts`, this methodology bridges human language with analytical querying. It employs transformer models to parse user intents (e.g., filtering, ranking) and extract parameters (e.g., region, dates). It then resolves these entities into contextually-aware, schema-linked SQL syntax, executing the generated queries against the processed dataset, thereby allowing dynamic, multi-turn conversational data exploration without manual scripting.

## Module 7: Goal Mapping & Recommendations
**Methodology:** Objective Decomposition and Strategic AI Synthesis
Found in `src/lib/module-7/` and `components/dashboard/GoalStrategyPanel.tsx`, this engine translates high-level business goals into actionable mathematical pathways. It decomposes objectives (e.g., "Increase Revenue") into constituent operational levers (Units Sold x AOV). Utilizing LLMs, it generates and ranks domain-appropriate intervention strategies based on expected impact, required effort, and cost efficiency, presenting structured scenarios (Lean, Balanced, Premium) for execution.

## Module 8: Strategy Forecasting
**Methodology:** Time-Series Predictive Modeling and Monte Carlo Simulation
Implemented via `src/lib/module-8/` (specifically `prophet-bridge.ts` and `monte-carlo.ts`), this module applies Facebook Prophet for robust baseline temporal forecasting, handling seasonal variations and trend shifts. It integrates predictive Monte Carlo simulations to statistically project multiple future scenarios (Baseline, Optimistic, Conservative) with specific confidence intervals (80% & 95%). This mathematically grounds strategic planning by quantifying the probability of goal attainment.

## Module 9: Report Export
**Methodology:** Automated Context Aggregation and Document Compilation
Functioning through `src/lib/module-9/` and the `/api/v1/report/generate/` route, the final module programmatically synthesizes the aggregated outputs of the entire pipeline—visualizations, KPIs, forecasting bands, and strategic recommendations. It algorithmically stitches these elements into a cohesive, presentation-ready format (PDF/Excel), rendering comprehensive business intelligence documents autonomously, thus removing the manual overhead of executive reporting.
