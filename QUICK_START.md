# VistaraBI - Quick Installation Commands

Copy and paste these commands to get started quickly!

---

## 🪟 Windows (PowerShell)

### Initial Setup
```powershell
# Clone and navigate
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Run automated setup
.\setup.ps1

# Setup database (ensure PostgreSQL is running)
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### Daily Development (3 Terminals)

**Terminal 1:**
```powershell
cd frontend; npm run dev
```

**Terminal 2:**
```powershell
cd backend; npm run dev
```

**Terminal 3:**
```powershell
cd ai; venv\Scripts\Activate.ps1; python app.py
```

---

## 🍎 Mac

### Initial Setup
```bash
# Clone and navigate
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh

# Setup database (ensure PostgreSQL is running)
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### Daily Development (3 Terminals)

**Terminal 1:**
```bash
cd frontend && npm run dev
```

**Terminal 2:**
```bash
cd backend && npm run dev
```

**Terminal 3:**
```bash
cd ai && source venv/bin/activate && python app.py
```

---

## 🐧 Linux

### Initial Setup
```bash
# Clone and navigate
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh

# Setup database (ensure PostgreSQL is running)
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

### Daily Development (3 Terminals)

**Terminal 1:**
```bash
cd frontend && npm run dev
```

**Terminal 2:**
```bash
cd backend && npm run dev
```

**Terminal 3:**
```bash
cd ai && source venv/bin/activate && python app.py
```

---

## 🐳 Docker (All Platforms)

### Initial Setup & Run
```bash
# Clone repository
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Build and start all services
docker-compose up --build
```

### Daily Development
```bash
# Start services
docker-compose up

# Stop services (Ctrl+C, then)
docker-compose down
```

---

## 🧪 Test Commands

### Quick Health Check
```powershell
# Backend
curl http://localhost:5000/api/health

# AI Service
curl http://localhost:8000

# Frontend
# Open http://localhost:3000 in browser
```

### Full Test Suite
```powershell
# Create test file
"date,revenue,units`n2024-01-01,1000,10" | Out-File test.csv

# Test upload
curl -X POST http://localhost:5000/api/upload -F "file=@test.csv"

# Test AI domain detection
curl -X POST http://localhost:8000/api/ai/domain/detect `
  -H "Content-Type: application/json" `
  -d '{\"data\": {}, \"columns\": [\"date\", \"revenue\"]}'
```

---

## 🔄 Git Workflow Commands

### Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### Daily Sync
```bash
git checkout develop
git pull origin develop
git checkout your-feature-branch
git merge develop
```

### Commit & Push
```bash
git add .
git commit -m "[Module] Description"
git push origin your-feature-branch
```

---

## 🗄️ Database Commands

### Create Database (psql)
```bash
psql -U postgres
CREATE DATABASE vistarabi;
\q
```

### View Database
```bash
cd backend
npx prisma studio
```

### Reset Database
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

---

## 🧹 Clean & Reinstall

### Frontend
```powershell
cd frontend
rm -r node_modules, package-lock.json
npm install
```

### Backend
```powershell
cd backend
rm -r node_modules, package-lock.json
npm install
npx prisma generate
```

### AI Service
```powershell
cd ai
rm -r venv
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## 📦 Add New Dependencies

### Frontend
```bash
cd frontend
npm install package-name
```

### Backend
```bash
cd backend
npm install package-name
```

### AI Service
```bash
cd ai
venv\Scripts\Activate.ps1  # Windows
# source venv/bin/activate  # Mac/Linux
pip install package-name
pip freeze > requirements.txt
```

---

## 🎯 URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React UI |
| Backend API | http://localhost:5000 | REST API |
| Backend Health | http://localhost:5000/api/health | Health check |
| AI Service | http://localhost:8000 | AI API |
| AI Docs | http://localhost:8000/docs | Interactive API docs |
| Prisma Studio | http://localhost:5555 | Database GUI |

---

## 💡 Pro Tips

**Use VS Code Terminal:**
- Split terminal (Ctrl+Shift+5)
- Run all 3 services in same window

**Watch Mode:**
All services auto-reload on file changes!

**Keyboard Shortcuts:**
- Ctrl+C: Stop service
- Ctrl+Z: Suspend (then `bg`)

**Logs:**
All services output logs to console for debugging

---

## 🆘 Emergency Commands

### Kill Processes
```powershell
# Windows
npx kill-port 3000
npx kill-port 5000
netstat -ano | findstr :8000

# Mac/Linux
lsof -ti:3000 | xargs kill
lsof -ti:5000 | xargs kill
lsof -ti:8000 | xargs kill
```

### Reset Everything
```bash
# Delete all node_modules and venv
rm -rf frontend/node_modules
rm -rf backend/node_modules
rm -rf ai/venv

# Reinstall
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd ai && python -m venv venv && venv\Scripts\Activate.ps1 && pip install -r requirements.txt
```

---

**🎉 Copy, paste, and go! Happy coding!**
