# 🚀 VistaraBI Project Setup Guide

This guide will walk you through setting up the complete **VistaraBI** development environment from scratch.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Node.js (v20 or higher)**: [Download Node.js](https://nodejs.org/)
2.  **npm (v10 or higher)**: Usually comes with Node.js.
3.  **Git**: [Download Git](https://git-scm.com/)
4.  **Ollama**: Required for Module 3 Phase 3C (AI Semantic Reasoning). [Download Ollama](https://ollama.com/)

---

## 🛠️ System Dependencies Setup

### 1. Ollama (AI Engine)
VistaraBI uses a local LLM for semantic domain reasoning.
1.  **Install Ollama**: Follow the installer prompts for your OS.
2.  **Start Ollama**: Run the application or use `ollama serve` in a terminal.
3.  **Pull the Model**: Open a new terminal and run:
    ```bash
    ollama pull qwen3:0.6b
    ```
    *Note: You can also use `llama3` or `mistral`, but `qwen3:0.6b` is the default for high-speed local processing.*

---

## 🚀 Project Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd vistarabi-landing
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (use `.env.example` if available as a template):
```env
# AI Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b

# Auth Secrets (Development defaults)
JWT_SECRET=your_jwt_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 4. Database Setup (Prisma)
VistaraBI currently uses an **Enhanced In-Memory Storage Engine** for development to ensure high speed and zero-config database setup. If you wish to use a persistent database:
1.  Configure `DATABASE_URL` in `.env`.
2.  Run migration:
    ```bash
    npx prisma generate
    ```

---

## 💻 Running the Application

### Start Development Server
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Architecture

- **`/src/app`**: Next.js App Router (Pages and API Routes).
- **`/src/components`**: UI Components (Domain badges, selection modals, etc.).
- **`/src/lib`**: Core Logic Engines:
    - `auth`: Authentication & Session management.
    - `domain`: Rule-based classification (Phase 3A & 3B).
    - `ai`: Semantic Reasoning Layer (Phase 3C).
    - `purification`: Data cleaning & normalization.
    - `quality`: Quality scoring & analysis.
- **`/prisma`**: Database schemas.
- **`/public`**: Static assets.

---

## 🧪 Verification Steps

To ensure everything is working correctly:
1.  **Check Local Server**: Navigate to `http://localhost:3000`.
2.  **Test AI Connection**: 
    - Open any project.
    - Click on the **"🧠 AI Assist"** button.
    - If it shows "Ollama Available", you are ready!
3.  **File Processing**: 
    - Upload a sample CSV (e.g., e-commerce orders).
    - Verify that the **Domain Badge** updates and quality analysis runs.

---

## 🛠️ Troubleshooting

- **Ollama Error**: Ensure `ollama serve` is running and you have pulled the model (`ollama pull qwen3:0.6b`).
- **Prisma Errors**: Run `npx prisma generate` to sync types.
- **Next.js Errors**: Try clearing the build cache by deleting the `.next` folder and restarting `npm run dev`.

---

## 📜 Development Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run lint` | Runs ESLint for code quality |
| `npx tsc --noEmit` | Checks for TypeScript errors |

---

**Happy Coding with VistaraBI!** 🚀
