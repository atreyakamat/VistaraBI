# VistaraBI Quick Start Script
# This script helps you set up VistaraBI quickly

Write-Host "🚀 VistaraBI Quick Start Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "✅ Python $pythonVersion installed" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "✅ PostgreSQL installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL not found in PATH. Make sure it's installed and running." -ForegroundColor Yellow
}

Write-Host "`n================================`n" -ForegroundColor Cyan

# Setup Frontend
Write-Host "📦 Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend
if (Test-Path "node_modules") {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Gray
} else {
    npm install
}
Set-Location ..
Write-Host "✅ Frontend setup complete`n" -ForegroundColor Green

# Setup Backend
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "node_modules") {
    Write-Host "Backend dependencies already installed" -ForegroundColor Gray
} else {
    npm install
}

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Please edit backend/.env with your database credentials" -ForegroundColor Yellow
}

Set-Location ..
Write-Host "✅ Backend setup complete`n" -ForegroundColor Green

# Setup AI Service
Write-Host "📦 Setting up AI Service..." -ForegroundColor Yellow
Set-Location ai
if (Test-Path "venv") {
    Write-Host "Virtual environment already exists" -ForegroundColor Gray
} else {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "Installing Python dependencies..." -ForegroundColor Gray
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt --quiet
deactivate

Set-Location ..
Write-Host "✅ AI Service setup complete`n" -ForegroundColor Green

# Setup Database
Write-Host "🗄️  Setting up Database..." -ForegroundColor Yellow
Write-Host "Please ensure PostgreSQL is running and you've configured backend/.env" -ForegroundColor Gray
Write-Host "`nTo setup database, run:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "  npx prisma generate`n" -ForegroundColor White

Write-Host "================================`n" -ForegroundColor Cyan
Write-Host "✅ VistaraBI Setup Complete!`n" -ForegroundColor Green

Write-Host "🚀 To start development:" -ForegroundColor Cyan
Write-Host "`n  Terminal 1 - Frontend:" -ForegroundColor Yellow
Write-Host "    cd frontend" -ForegroundColor White
Write-Host "    npm run dev`n" -ForegroundColor White

Write-Host "  Terminal 2 - Backend:" -ForegroundColor Yellow
Write-Host "    cd backend" -ForegroundColor White
Write-Host "    npm run dev`n" -ForegroundColor White

Write-Host "  Terminal 3 - AI Service:" -ForegroundColor Yellow
Write-Host "    cd ai" -ForegroundColor White
Write-Host "    venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "    python app.py`n" -ForegroundColor White

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - Setup Guide: docs/SETUP.md" -ForegroundColor White
Write-Host "  - API Docs: docs/API.md" -ForegroundColor White
Write-Host "  - Architecture: docs/ARCHITECTURE.md" -ForegroundColor White
Write-Host "  - Testing: docs/TEST.md`n" -ForegroundColor White

Write-Host "Happy coding! 💻`n" -ForegroundColor Green
