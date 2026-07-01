# VistaraBI Windows Docker Deployment Guide

This guide covers how to run the complete VistaraBI stack (Next.js App + PostgreSQL + Ollama AI + Python/Prophet Forecasting) on a Windows PC using Docker.

## Step 1: Prerequisites

Before starting, ensure you have the following installed on your Windows machine:

1. **Docker Desktop for Windows**: 
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/).
   - Ensure the **WSL 2 based engine** is enabled (this is usually the default and performs much better than Hyper-V).
   - Start Docker Desktop and ensure the icon in your system tray shows it is "Running".

2. **Git/Terminal**: Use PowerShell, Command Prompt, or Git Bash.

## Step 2: Prepare the Environment

The application requires secure keys and configuration to run. 

1. Open PowerShell or your terminal in the project root (`c:\Projects\VistaraBI\vistarabi-landing`).
2. Generate two secure 64-character random strings. You can run this command twice in PowerShell:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Open the `.env` file in the root of the project.
4. Replace the placeholder secrets with the strings you just generated:
   ```env
   JWT_SECRET=your_first_long_random_string_here
   NEXTAUTH_SECRET=your_second_long_random_string_here
   ```
5. *(Highly Recommended)* VistaraBI defaults to a **Cloud-First AI Orchestration**. Add your Groq API key to enable fast, cloud-based AI reasoning for complex strategy scenarios. If Groq is unavailable, it gracefully falls back to your local Ollama daemon.
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

## Step 3: Build and Start the Stack

The `docker-compose.yml` file is configured to spin up the database, the local AI server, and the web application.

1. Open PowerShell in the project directory:
   ```powershell
   cd c:\Projects\VistaraBI\vistarabi-landing
   ```
2. Build the Docker image and start the containers in the background (`-d` means detached mode):
   ```powershell
   docker-compose up -d --build
   ```
   *Note: The first time you run this, it will take several minutes to download the base images (Node.js slim, Postgres, Ollama), install Python and Facebook Prophet, and build the VistaraBI Next.js app.*

## Step 4: Download the Local AI Model (Ollama)

VistaraBI uses Ollama to run privacy-first AI models locally. **VistaraBI now features Auto-Pulling.** If a local model is missing when a fallback request occurs, VistaraBI will automatically trigger a background pull. 

However, you can manually pre-warm the container by pulling the default `qwen3.5:0.8b` model immediately:

1. Once the containers are running, execute this command:
   ```powershell
   docker exec vistarabi-ollama ollama pull qwen3.5:0.8b
   ```
   *Note: This downloads about ~500MB of data. Wait for the download to finish (it will say "success").*

## Step 5: Verify the Deployment

1. **Check the logs** to ensure the app started successfully and ran the database migrations:
   ```powershell
   docker-compose logs -f app
   ```
   *(Press `Ctrl+C` to exit the log view)*
2. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```
   You should see the VistaraBI platform running.

## Step 6: Managing the Deployment

Here are the common commands you'll need to manage your local Docker deployment:

**Stop the application (keeps data intact):**
```powershell
docker-compose stop
```

**Start the application again:**
```powershell
docker-compose start
```

**Completely remove the containers (keeps the database volume so data is saved):**
```powershell
docker-compose down
```

**Rebuild the application (do this after changing source code):**
```powershell
docker-compose up -d --build
```

## Troubleshooting

- **Port 5432 or 3000 is already in use:** If you have a local PostgreSQL installed on Windows, it might block port 5432. Stop your local Postgres service, or change the port mapping in `docker-compose.yml` from `"5432:5432"` to `"5433:5432"`.
- **Database Connection Errors:** The `docker-entrypoint.sh` handles database migrations automatically. If the app fails to connect, wait 10 seconds and check `docker-compose logs app` again; it sometimes takes a moment for Postgres to accept connections on the very first boot.
- **AI isn't responding or throwing "Downloading" errors:** If the unified client encounters a missing local model, it will trigger an auto-pull and throw an error telling you to wait a few minutes. Check `docker logs vistarabi-ollama` to monitor the download progress.
- **Prophet Forecasting falls back to Linear:** Ensure that your target dataset has at least 8 distinct data points. If you provide fewer points, the Python/Prophet bridge safely degrades to a linear fallback mechanism.
