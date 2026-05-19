# Changelog

## Unreleased

- fix: Make Prophet bridge more resilient
  - PROPHET_MIN_DATA_POINTS is now configurable with environment variable (default 14)
  - Bridge verifies scripts/forecast_bridge.py presence and tries python3 then python
  - Improved error logging so Node falls back cleanly to linear projection when Prophet unavailable
- feat: Saas data processor robust to header variations and coerces types
- feat: Orchestrator optional file-backed persistence (enable with PERSIST_CONVERSATION_FILE=true or set CONVERSATION_FILE)
- chore: Recommend upgrading default local Ollama model to llama3:8b in docker-compose.yml

# How to verify
1. Build and test:
   cd vistarabi-landing
   npm ci
   npm run build
   npm test

2. Docker integration (optional):
   docker-compose build --no-cache app
   docker-compose up --build

Environment variables:
- PROPHET_MIN_DATA_POINTS (default 14)
- PERSIST_CONVERSATION_FILE (set to "true" to enable local file persistence)
- CONVERSATION_FILE (path to persisted conversation JSON file)
- OLLAMA_MODEL (local model; recommended: llama3:8b)
