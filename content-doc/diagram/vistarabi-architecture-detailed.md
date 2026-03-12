# Architecture of VistaraBI

This diagram illustrates the full system architecture of VistaraBI, from the frontend layers to the AI-driven processing and database.

**Text-to-Image Prompt:**
> A professional, modern software architecture diagram for an AI Business Intelligence platform called "VistaraBI". The diagram should be organized into four distinct layers: Presentation (Next.js, Tailwind), Processing (Business Logic, KPI Engine), Data (PostgreSQL, Prisma), and ML/AI (Ollama, Local LLM). Use clean, technical icons and glowing connecting lines to show data flow. The style should be high-tech, minimalist, with a dark theme and teal/blue accents.

```mermaid
graph TD
    subgraph "Presentation Layer (App Router)"
        UI[Next.js 16 + React 19]
        CSS[TailwindCSS 4 + Framer Motion]
    end

    subgraph "Processing Layer (Business Logic)"
        KE[KPI Engine: src/lib/kpi]
        PE[Purification Engine: src/lib/purification]
        SE[Strategy Engine: src/lib/module-7]
        EX[Execution Pool: src/lib/execution]
    end

    subgraph "Data Layer (Persistence)"
        DB[(PostgreSQL)]
        ORM[Prisma ORM 5.10]
    end

    subgraph "ML/AI Layer (Intelligence)"
        OL[Ollama / Local LLM]
        AI[AI Reasoning: src/lib/ai]
    end

    UI --> KE
    UI --> SE
    KE --> EX
    EX --> ORM
    ORM --> DB
    KE -.-> AI
    AI --- OL
    SE --- AI
```
