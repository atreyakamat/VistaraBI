Prophet Bridge & Related Fixes

Summary
- PROPHET_MIN_DATA_POINTS: configurable via environment variable (default 14). Adjust when your dataset frequency differs (e.g., monthly vs daily).
- Bridge resiliency: Node.js now verifies scripts/forecast_bridge.py is present and tries python3 then python. If Python or Prophet missing, Node falls back to linear projection with clear log messages.
- Docker: runner stage installs Python and Prophet; Dockerfile copies scripts into final image.
- SaaS CSV processing: header normalization and type coercion added to avoid silent KPI zeroing.
- Conversation memory: optional file-backed persistence for single-host durability (PERSIST_CONVERSATION_FILE=true). Use Redis for multi-instance.

Environment variables
- PROPHET_MIN_DATA_POINTS (int) — minimum points before attempting Prophet (default 14)
- PERSIST_CONVERSATION_FILE (true/false) — enable file persistence
- CONVERSATION_FILE — explicit path to persistence JSON file
- OLLAMA_MODEL — local Ollama model; recommended: llama3:8b

Operational checks
- Start stack via: docker-compose up --build
- Check app logs for "[Prophet] Sending" or "[Prophet] Bridge failed" messages
- If you expect Prophet to run but it falls back, ensure Python and Prophet are installed inside the runtime (Dockerfile already installs them in runner stage)

Notes
- For multi-host scale, do not rely on file-backed orchestration memory; use Redis.
- UI changes intentionally not made to avoid altering UX during launch. Recommend a small UI banner showing when Prophet fallback is used; can implement on request.
