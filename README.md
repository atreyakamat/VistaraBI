# VistaraBI - Intelligent Business Analytics Platform

VistaraBI is an AI-powered business intelligence platform that automatically detects business domains, extracts relevant KPIs, and provides intelligent insights through natural language conversations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 15+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Create develop branch
git checkout -b develop
```

## 📁 Project Structure

```
vistarabi/
├── frontend/     # React + TypeScript + Vite (Port 3000)
├── backend/      # Node.js + Express + Prisma (Port 5000)
├── ai/           # Python + FastAPI (Port 8000)
├── docs/         # Documentation
└── shared/       # Shared configurations
```

## 🛠️ Setup Each Service

### 1. Frontend Setup (Harsh)
```bash
cd frontend
npm install
npm run dev
```
Visit: http://localhost:3000

### 2. Backend Setup (Parth)
```bash
cd backend
npm install

# Setup database
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev --name init
npx prisma generate

# Start server
npm run dev
```
Visit: http://localhost:5000/api/health

### 3. AI Services Setup (Atreya)
```bash
cd ai
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start service
python app.py
```
Visit: http://localhost:8000

## 🧪 Testing the Skeleton

### Test 1: Health Checks
```bash
# Test Backend
curl http://localhost:5000/api/health

# Test AI Service
curl http://localhost:8000

# Test Frontend
# Open browser to http://localhost:3000
```

### Test 2: Full Stack Communication
```bash
# Start all services in separate terminals
cd frontend && npm run dev
cd backend && npm run dev
cd ai && python app.py

# Frontend should display "All Systems Operational" if all services are running
```

## 👥 Team Responsibilities

- **Harsh**: Frontend (React + TypeScript)
- **Parth**: Backend (Node.js + Express + Prisma)
- **Atreya**: AI Services (Python + FastAPI)

## 🔄 Development Workflow

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work on your feature
# ... code ...

# Commit and push
git add .
git commit -m "[Module] Brief description"
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# After review, merge to develop
```

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## 🐛 Troubleshooting

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Backend database errors
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

### AI service import errors
```bash
cd ai
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 📝 License

MIT License - see LICENSE file for details
