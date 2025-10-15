#!/bin/bash

# VistaraBI Quick Start Script for Mac/Linux
# This script helps you set up VistaraBI quickly

echo "🚀 VistaraBI Quick Start Setup"
echo "================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION installed"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "✅ Python $PYTHON_VERSION installed"
else
    echo "❌ Python not found. Please install Python 3.9+"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL installed"
else
    echo "⚠️  PostgreSQL not found in PATH. Make sure it's installed and running."
fi

echo ""
echo "================================"
echo ""

# Setup Frontend
echo "📦 Setting up Frontend..."
cd frontend
if [ -d "node_modules" ]; then
    echo "Frontend dependencies already installed"
else
    npm install
fi
cd ..
echo "✅ Frontend setup complete"
echo ""

# Setup Backend
echo "📦 Setting up Backend..."
cd backend
if [ -d "node_modules" ]; then
    echo "Backend dependencies already installed"
else
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

cd ..
echo "✅ Backend setup complete"
echo ""

# Setup AI Service
echo "📦 Setting up AI Service..."
cd ai
if [ -d "venv" ]; then
    echo "Virtual environment already exists"
else
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

cd ..
echo "✅ AI Service setup complete"
echo ""

# Setup Database
echo "🗄️  Setting up Database..."
echo "Please ensure PostgreSQL is running and you've configured backend/.env"
echo ""
echo "To setup database, run:"
echo "  cd backend"
echo "  npx prisma migrate dev --name init"
echo "  npx prisma generate"
echo ""

echo "================================"
echo ""
echo "✅ VistaraBI Setup Complete!"
echo ""

echo "🚀 To start development:"
echo ""
echo "  Terminal 1 - Frontend:"
echo "    cd frontend"
echo "    npm run dev"
echo ""

echo "  Terminal 2 - Backend:"
echo "    cd backend"
echo "    npm run dev"
echo ""

echo "  Terminal 3 - AI Service:"
echo "    cd ai"
echo "    source venv/bin/activate"
echo "    python app.py"
echo ""

echo "📚 Documentation:"
echo "  - Setup Guide: docs/SETUP.md"
echo "  - API Docs: docs/API.md"
echo "  - Architecture: docs/ARCHITECTURE.md"
echo "  - Testing: docs/TEST.md"
echo ""

echo "Happy coding! 💻"
echo ""
