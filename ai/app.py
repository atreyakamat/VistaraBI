from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

# Import routes
from routes import domain, kpis, chat, goals, forecast

# Create FastAPI app
app = FastAPI(
    title="VistaraBI AI Service",
    description="AI-powered analytics and insights for VistaraBI",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(domain.router, prefix="/api/ai/domain", tags=["domain"])
app.include_router(kpis.router, prefix="/api/ai/kpis", tags=["kpis"])
app.include_router(chat.router, prefix="/api/ai/chat", tags=["chat"])
app.include_router(goals.router, prefix="/api/ai/goals", tags=["goals"])
app.include_router(forecast.router, prefix="/api/ai/forecast", tags=["forecast"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "VistaraBI AI Service",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "domain": "/api/ai/domain",
            "kpis": "/api/ai/kpis",
            "chat": "/api/ai/chat",
            "goals": "/api/ai/goals",
            "forecast": "/api/ai/forecast"
        }
    }

# Health check endpoint
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🤖 Starting VistaraBI AI Service...")
    print("📍 Running on: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
