# Domain Prediction Algorithm Workflow

This flowchart traces the domain prediction lifecycle, from raw column scanning to confidence-based classification and manual fallback.

**Text-to-Image Prompt:**
> A flowchart representing an AI-driven domain classification algorithm. The flow starts with "Raw Columns Ingestion", moves to "Keyword Scanning", then "Confidence Scoring (0-100%)", followed by a decision diamond: "Confidence >= 75%?". One path leads to "Auto-Assign Domain", and the other to "Manual Selection Required". Clean, technical flowchart with soft gradients and professional icons.

```mermaid
flowchart TD
    A[Raw Columns Ingestion] --> B[scanProjectColumns: src/lib/domain/column-scanner]
    B --> C[Keyword Scanning: normalizeColumnName + findKeywordMatch]
    C --> D[calculateDomainScores: src/lib/domain/domain-scorer]
    D --> E[Confidence Scoring: (Matches / Total Keywords) * 100]
    E --> F{Confidence >= 75%?}
    F -- Yes --> G[AUTO_ASSIGNED: Detected Domain]
    F -- No --> H[MANUAL_REQUIRED: Suggestion + Feedback]
    G --> I[Final Domain Metadata: src/lib/kpi/domain-metadata]
    H --> I
```
