# VistaraBI - First Time Setup

## 🎯 For Team Members

Welcome to VistaraBI! This guide will help you get started quickly.

---

## 📥 Step 1: Clone Repository

```powershell
# Clone the repository
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI

# Create develop branch
git checkout -b develop
```

---

## ⚡ Step 2: Quick Setup (Recommended)

### Windows (PowerShell):
```powershell
.\setup.ps1
```

### Mac/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

This script will:
- Check prerequisites
- Install frontend dependencies
- Install backend dependencies
- Setup Python virtual environment
- Create .env file

---

## 🗄️ Step 3: Setup Database

### Create PostgreSQL Database

**Option 1: Using psql**
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vistarabi;

# Exit
\q
```

**Option 2: Using pgAdmin**
- Open pgAdmin
- Right-click on Databases
- Create → Database
- Name: `vistarabi`

### Configure Database Connection

Edit `backend/.env` file:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/vistarabi"
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

### Run Migrations

```powershell
cd backend
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

---

## 🚀 Step 4: Start Development

### Open 3 Terminals

**Terminal 1 - Frontend:**
```powershell
cd frontend
npm run dev
```
→ Opens at http://localhost:3000

**Terminal 2 - Backend:**
```powershell
cd backend
npm run dev
```
→ Opens at http://localhost:5000

**Terminal 3 - AI Service:**
```powershell
cd ai
venv\Scripts\Activate.ps1
python app.py
```
→ Opens at http://localhost:8000

---

## ✅ Step 5: Verify Setup

Open http://localhost:3000 in your browser.

**You should see:**
- ✅ VistaraBI dashboard
- ✅ Green status indicators for all services
- ✅ "All Systems Operational" message

**Test APIs:**
```powershell
# Backend
curl http://localhost:5000/api/health

# AI Service
curl http://localhost:8000
```

---

## 🎓 Step 6: Understand Project Structure

```
VistaraBI/
├── frontend/          # React app (Harsh)
├── backend/           # Node.js API (Parth)
├── ai/                # Python AI (Atreya)
├── docs/              # Documentation
├── setup.ps1          # Windows setup script
└── setup.sh           # Mac/Linux setup script
```

---

## 📚 Step 7: Read Documentation

**Must Read:**
1. [SETUP.md](docs/SETUP.md) - Detailed setup guide
2. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
3. [API.md](docs/API.md) - API documentation
4. [TEST.md](docs/TEST.md) - Testing guide

**Optional:**
5. [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

---

## 🔧 Step 8: Create Your Feature Branch

```powershell
# Harsh (Frontend)
git checkout -b feature/file-upload-ui

# Parth (Backend)
git checkout -b feature/data-processing

# Atreya (AI)
git checkout -b feature/domain-detection
```

---

## 🐛 Troubleshooting

### PostgreSQL not found
- Install PostgreSQL 15+
- Add to PATH: `C:\Program Files\PostgreSQL\15\bin`

### Node.js not found
- Install Node.js 18+ from nodejs.org
- Restart terminal after installation

### Python not found
- Install Python 3.9+ from python.org
- Check "Add to PATH" during installation

### Dependencies install fails
```powershell
# Frontend
cd frontend
rm -r node_modules, package-lock.json
npm install

# Backend
cd backend
rm -r node_modules, package-lock.json
npm install

# AI
cd ai
rm -r venv
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Port already in use
```powershell
npx kill-port 3000
npx kill-port 5000

# For port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## ✨ You're Ready!

Once everything is green:
- ✅ Start building your assigned features
- ✅ Commit regularly
- ✅ Create PRs for review
- ✅ Communicate with team

---

## 🆘 Need Help?

1. Check docs/ folder
2. Review error messages
3. Search online
4. Ask team members
5. Create GitHub issue

---

**Happy coding! 🚀**

*Now go build something amazing with VistaraBI!*
