# VistaraBI Workspace

Welcome to the **VistaraBI** mono-repo. This workspace contains the intelligent business analytics platform and its associated tools.

## 📁 Repository Structure

- `vistarabi-landing/`: The main Next.js 16 application containing Modules 1–7 and the core analytics engine.
- `content-doc/`: Documentation assets, including presentations and architectural diagrams.
- `ai-chat-manual/`: Domain-specific AI guidance manuals.
- `_sam/`: Shared agent definitions for the SAM (Smart Agent Manager) TDD system.

## 🚀 Key Documentation

- **[Main Project Context (GEMINI.md)](vistarabi-landing/GEMINI.md)**: Essential context for the core application, tech stack, and module architecture.
- **[Architectural Diagrams](content-doc/diagram/)**: Visual representations of system flows, KPI reasoning, and the goal strategy pipeline.
- **[SAM Documentation](vistarabi-landing/sam/README.md)**: Details on the autonomous TDD agent system.
- **[Module 7 Architecture](vistarabi-landing/MODULE_7_ARCHITECTURE.md)**: Deep dive into the Goal Strategy Engine.

## 🛠 Quick Start

To start development in the main application:

```bash
cd vistarabi-landing
npm install
npm run dev
```

For more details, see the [vistarabi-landing/README.md](vistarabi-landing/README.md).
