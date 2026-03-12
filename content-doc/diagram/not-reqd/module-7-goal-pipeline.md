# Module 7: Goal Strategy Engine Pipeline

This diagram outlines the 7-stage linear pipeline of Module 7, transforming natural language goals into actionable strategic plans.

```mermaid
graph TD
    UserGoal[User Input: "Increase revenue by 20%"]

    subgraph "Module 7: The Prescriptive Intelligence Layer"
        Stage1[Stage 1: Goal Parser]
        Stage2[Stage 2: Goal-to-KPI Mapping]
        Stage3[Stage 3: Goal Decomposer]
        Stage4[Stage 4: Strategy Generation]
        Stage5[Stage 5: Strategy Ranking]
        Stage6[Stage 6: Scenario Builder]
        Stage7[Stage 7: Location Strategy Split]
    end

    UserGoal --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3
    Stage3 --> Stage4
    Stage4 --> Stage5
    Stage5 --> Stage6
    Stage6 --> Stage7
    Stage7 --> StrategyCanvas[Final Output: Strategy Canvas]
```
