# VistaraBI - Complete Setup Guide

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** 18+ and npm ([Download](https://nodejs.org/))
- **Python** 3.9+ ([Download](https://www.python.org/downloads/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/downloads))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/atreyakamat/VistaraBI.git
cd VistaraBI
```

### 2. Create Development Branch

```bash
git checkout -b develop
```

## 🎯 Step-by-Step Setup

### Frontend Setup (Harsh)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend should now be running at **http://localhost:3000**

#### Troubleshooting Frontend
If you encounter errors:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# If port 3000 is in use
# Edit vite.config.ts and change the port number
```

---

### Backend Setup (Parth)

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env file with your database credentials
# For Windows, use: notepad .env
# For Mac/Linux, use: nano .env

# Create database (if not exists)
# In psql or pgAdmin, create database named 'vistarabi'

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

The backend should now be running at **http://localhost:5000**

#### Database Setup Commands

**Windows (PowerShell):**
```powershell
# Start PostgreSQL service (if not running)
net start postgresql-x64-15

# Create database using psql
psql -U postgres
CREATE DATABASE vistarabi;
\q
```

**Mac:**
```bash
# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb vistarabi
```

**Linux:**
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb vistarabi
```

#### .env Configuration

Your `.env` file should look like:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/vistarabi"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
NODE_ENV=development
AI_SERVICE_URL="http://localhost:8000"
```

#### Troubleshooting Backend
```bash
# If Prisma errors occur
npx prisma generate
npx prisma migrate reset

# If database connection fails
# Check PostgreSQL is running
# Verify DATABASE_URL in .env

# View database in Prisma Studio
npx prisma studio
```

---

### AI Services Setup (Atreya)

```bash
cd ai

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Windows (Command Prompt):
venv\Scripts\activate.bat

# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model
python -m spacy download en_core_web_sm

# Start AI service
python app.py
```

The AI service should now be running at **http://localhost:8000**

Visit **http://localhost:8000/docs** for interactive API documentation.

#### Troubleshooting AI Service
```bash
# If pip install fails
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir

# If spaCy model download fails
python -m pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.0/en_core_web_sm-3.7.0-py3-none-any.whl

# If module import errors
# Make sure virtual environment is activated
# Check Python version: python --version (should be 3.9+)
```

---

## ✅ Testing the Complete Setup

### Test 1: Individual Service Health

**Frontend:**
Open browser to http://localhost:3000
- You should see the VistaraBI dashboard
- Status indicators should show service status

**Backend:**
```bash
curl http://localhost:5000/api/health
```
Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

**AI Service:**
```bash
curl http://localhost:8000
```
Expected response:
```json
{
  "message": "VistaraBI AI Service",
  "status": "operational"
}
```

### Test 2: Full Stack Integration

1. **Start all services** (in separate terminals):
```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Backend
cd backend && npm run dev

# Terminal 3 - AI Service
cd ai && python app.py
```

2. **Open frontend** at http://localhost:3000

3. **Check status indicators** - All should be green/online

4. **Test file upload** (coming soon feature):
   - Upload button should be visible
   - File type validation should work

---

## 🐳 Docker Setup (Optional)

If you prefer using Docker:

```bash
# Make sure Docker is installed and running

# Build and start all services
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

Services will be available at the same ports:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- AI Service: http://localhost:8000
- PostgreSQL: localhost:5432

---

## 🔄 Development Workflow

### Daily Workflow

```bash
# Morning: Sync with develop branch
git checkout develop
git pull origin develop
git checkout your-feature-branch
git merge develop

# Work on your feature
# ... make changes ...

# Test your changes
# Run the service you're working on

# Commit your work
git add .
git commit -m "[Module] Brief description of changes"
git push origin your-feature-branch
```

### Creating a Feature Branch

```bash
# Harsh (Frontend)
git checkout -b feature/file-upload-ui

# Parth (Backend)
git checkout -b feature/data-cleaning-service

# Atreya (AI)
git checkout -b feature/domain-classifier
```

### Committing Changes

Use descriptive commit messages:
```bash
git commit -m "[Frontend] Add file upload component"
git commit -m "[Backend] Implement CSV parser"
git commit -m "[AI] Add domain classification model"
```

---

## 📦 Package Management

### Frontend (npm)
```bash
# Add new package
npm install package-name

# Remove package
npm uninstall package-name

# Update packages
npm update
```

### Backend (npm)
```bash
# Add new package
npm install package-name

# Add dev dependency
npm install -D package-name

# Update Prisma schema after changes
npx prisma generate
npx prisma migrate dev --name description
```

### AI Service (pip)
```bash
# Add new package
pip install package-name

# Update requirements.txt
pip freeze > requirements.txt

# Install from requirements.txt
pip install -r requirements.txt
```

---

## 🔍 Useful Commands

### Frontend Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend Commands
```bash
npm run dev              # Start with auto-reload
npm start                # Start production server
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create new migration
```

### AI Service Commands
```bash
python app.py                    # Start service
python -m pytest                 # Run tests (when added)
pip list                         # List installed packages
```

---

## 🆘 Common Issues & Solutions

### Issue: Port Already in Use

**Frontend (Port 3000):**
- Edit `vite.config.ts` and change port in server config
- Or kill process using port: `npx kill-port 3000`

**Backend (Port 5000):**
- Change PORT in `.env` file
- Or: `npx kill-port 5000`

**AI Service (Port 8000):**
- Edit `app.py` and change port in `uvicorn.run()`
- Or kill process using port

### Issue: Database Connection Failed

1. Check PostgreSQL is running
2. Verify DATABASE_URL in `.env`
3. Test connection: `psql -U postgres -d vistarabi`
4. Reset database: `npx prisma migrate reset`

### Issue: Module Not Found (Python)

1. Activate virtual environment
2. Reinstall requirements: `pip install -r requirements.txt`
3. Check Python version: `python --version`

### Issue: TypeScript Errors (Frontend)

1. Restart VS Code
2. Clear cache: `rm -rf node_modules && npm install`
3. Restart TypeScript server in VS Code

---

## 📊 Project Status Checklist

Before starting development, ensure:

- [ ] All three services start without errors
- [ ] Frontend shows "All Systems Operational"
- [ ] Backend `/api/health` returns success
- [ ] AI service `/health` returns healthy
- [ ] Database connection works
- [ ] You can access all URLs (3000, 5000, 8000)
- [ ] Git is configured and you're on develop branch

---

## 🎓 Next Steps

Once setup is complete:

1. **Review the architecture** in `docs/ARCHITECTURE.md`
2. **Check API documentation** in `docs/API.md`
3. **Start with your first feature** based on team assignment
4. **Join team standups** to sync progress

---

## 📞 Getting Help

If you encounter issues:

1. Check this SETUP.md file
2. Review error messages carefully
3. Search for solutions online
4. Ask team members on your communication channel
5. Create an issue on GitHub with detailed error logs

---

## 🎉 Success!

If all services are running and tests pass, you're ready to start building VistaraBI! 🚀

Happy coding! 💻
