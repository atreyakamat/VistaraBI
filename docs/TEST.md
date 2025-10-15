# VistaraBI - Test Instructions

## 🧪 Complete Testing Guide

This document provides step-by-step instructions to test the VistaraBI skeleton setup.

---

## ✅ Pre-Test Checklist

Before running tests, ensure:

- [ ] PostgreSQL is installed and running
- [ ] Node.js 18+ is installed
- [ ] Python 3.9+ is installed
- [ ] All dependencies are installed (see SETUP.md)

---

## 🚀 Test 1: Individual Service Health Checks

### Frontend Test

**Step 1:** Start the frontend server
```bash
cd frontend
npm run dev
```

**Step 2:** Open browser to http://localhost:3000

**Expected Results:**
- ✅ Page loads without errors
- ✅ "VistaraBI" title is visible
- ✅ Status indicators are present (may show offline for other services)
- ✅ "Welcome to VistaraBI" message appears
- ✅ Feature cards are displayed
- ✅ No console errors in browser DevTools

**Screenshot Verification:**
You should see a clean dashboard with status indicators at the top.

---

### Backend Test

**Step 1:** Create .env file
```bash
cd backend
cp .env.example .env
```

**Step 2:** Edit .env with your database credentials
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/vistarabi"
```

**Step 3:** Setup database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Step 4:** Start backend server
```bash
npm run dev
```

**Step 5:** Test health endpoint

**Using Browser:**
Open http://localhost:5000/api/health

**Using cURL (PowerShell):**
```powershell
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "VistaraBI Backend is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "services": {
    "backend": "operational",
    "database": "operational"
  }
}
```

**Step 6:** Test root endpoint
```powershell
curl http://localhost:5000
```

**Expected Response:**
```json
{
  "message": "VistaraBI Backend API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health",
    "upload": "/api/upload",
    ...
  }
}
```

---

### AI Service Test

**Step 1:** Activate virtual environment and start service
```powershell
cd ai
venv\Scripts\Activate.ps1
python app.py
```

**Step 2:** Test root endpoint
```powershell
curl http://localhost:8000
```

**Expected Response:**
```json
{
  "message": "VistaraBI AI Service",
  "version": "1.0.0",
  "status": "operational",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "endpoints": {
    "domain": "/api/ai/domain",
    "kpis": "/api/ai/kpis",
    ...
  }
}
```

**Step 3:** Visit interactive docs
Open http://localhost:8000/docs in browser

**Expected Results:**
- ✅ Swagger UI documentation loads
- ✅ All endpoints are listed
- ✅ You can expand and see endpoint details

**Step 4:** Test an AI endpoint
```powershell
curl -X POST http://localhost:8000/api/ai/domain/detect `
  -H "Content-Type: application/json" `
  -d '{\"data\": {}, \"columns\": [\"date\", \"revenue\"]}'
```

**Expected Response:**
```json
{
  "domain": "retail",
  "confidence": 0.85,
  "suggestions": [...]
}
```

---

## 🔗 Test 2: Full Stack Integration

**Step 1:** Start all services in separate terminals

**Terminal 1 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 - AI Service:**
```bash
cd ai
venv\Scripts\Activate.ps1
python app.py
```

**Step 2:** Open frontend at http://localhost:3000

**Expected Results:**
- ✅ All three status indicators show "online" (green dots)
- ✅ Backend status: Online
- ✅ AI Service status: Online
- ✅ System Status card shows:
  - Backend API: ok
  - Database: connected
  - Timestamp: current time

**Step 3:** Check browser console
- ✅ No errors should appear
- ✅ Successful API calls visible in Network tab

---

## 🧪 Test 3: API Endpoint Testing

### Test Backend Endpoints

**Test Upload Endpoint:**
Create a test CSV file first:
```powershell
# Create test file
@"
date,revenue,units
2024-01-01,1000,10
2024-01-02,1500,15
"@ | Out-File -FilePath test.csv -Encoding utf8
```

Upload the file:
```powershell
curl -X POST http://localhost:5000/api/upload `
  -F "file=@test.csv"
```

**Expected Response:**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "originalName": "test.csv",
    "fileName": "file-...",
    "size": ...,
    "type": "text/csv"
  }
}
```

**Test Other Endpoints:**
```powershell
# Files
curl http://localhost:5000/api/files

# KPIs
curl http://localhost:5000/api/kpis

# Goals
curl http://localhost:5000/api/goals
```

All should return "Coming soon" responses without errors.

---

### Test AI Endpoints

**Test Domain Detection:**
```powershell
curl -X POST http://localhost:8000/api/ai/domain/detect `
  -H "Content-Type: application/json" `
  -d '{\"data\": {}, \"columns\": [\"product\", \"revenue\", \"quantity\"]}'
```

**Test KPI Extraction:**
```powershell
curl -X POST http://localhost:8000/api/ai/kpis/extract `
  -H "Content-Type: application/json" `
  -d '{\"domain\": \"retail\", \"columns\": [\"revenue\"], \"data_sample\": {}}'
```

**Test Chat:**
```powershell
curl -X POST http://localhost:8000/api/ai/chat `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"What is my revenue?\"}'
```

All should return placeholder responses.

---

## 🐳 Test 4: Docker Setup (Optional)

**Step 1:** Ensure Docker is installed and running
```powershell
docker --version
docker-compose --version
```

**Step 2:** Build and start services
```powershell
docker-compose up --build
```

**Expected Results:**
- ✅ All services build successfully
- ✅ No build errors
- ✅ Services start on correct ports
- ✅ Can access all three services

**Step 3:** Test services
- Visit http://localhost:3000 (frontend)
- Visit http://localhost:5000/api/health (backend)
- Visit http://localhost:8000 (ai service)

**Step 4:** Stop services
```powershell
docker-compose down
```

---

## ✅ Test 5: Database Testing

**Step 1:** Open Prisma Studio
```bash
cd backend
npx prisma studio
```

**Expected Results:**
- ✅ Prisma Studio opens at http://localhost:5555
- ✅ All tables are visible (User, File, KPI, Goal, Action, Chat)
- ✅ Tables are empty (fresh installation)
- ✅ Can view table structure

**Step 2:** Test database connection via psql (optional)
```powershell
psql -U postgres -d vistarabi
```

```sql
-- List tables
\dt

-- Expected: users, files, kpis, goals, actions, chats

-- Check schema
\d users

-- Exit
\q
```

---

## 🎯 Test Results Summary

After completing all tests, verify:

### Frontend ✅
- [ ] Runs on port 3000
- [ ] UI loads correctly
- [ ] Status indicators work
- [ ] No console errors

### Backend ✅
- [ ] Runs on port 5000
- [ ] Health endpoint responds
- [ ] Database connection works
- [ ] All routes are defined
- [ ] File upload works

### AI Service ✅
- [ ] Runs on port 8000
- [ ] API documentation available
- [ ] All endpoints respond
- [ ] Placeholder responses work

### Integration ✅
- [ ] All services run simultaneously
- [ ] Frontend communicates with backend
- [ ] Status indicators update correctly
- [ ] No CORS errors

### Database ✅
- [ ] PostgreSQL running
- [ ] Migrations applied
- [ ] Prisma connection works
- [ ] All tables created

---

## 🐛 Common Test Failures & Fixes

### Frontend won't start
```bash
rm -rf node_modules package-lock.json
npm install
```

### Backend database error
```bash
npx prisma migrate reset
npx prisma migrate dev
npx prisma generate
```

### AI service import error
```bash
pip install -r requirements.txt --force-reinstall
```

### Port already in use
```powershell
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5000
npx kill-port 5000

# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## 📊 Test Report Template

After testing, fill out this report:

```
VistaraBI Test Report
Date: ___________
Tester: ___________

Frontend Tests:
[ ] Server starts ............. PASS / FAIL
[ ] UI loads .................. PASS / FAIL
[ ] Status indicators work .... PASS / FAIL

Backend Tests:
[ ] Server starts ............. PASS / FAIL
[ ] Health check .............. PASS / FAIL
[ ] Database connection ....... PASS / FAIL
[ ] File upload ............... PASS / FAIL

AI Service Tests:
[ ] Server starts ............. PASS / FAIL
[ ] API docs load ............. PASS / FAIL
[ ] Endpoints respond ......... PASS / FAIL

Integration Tests:
[ ] All services running ...... PASS / FAIL
[ ] Frontend-Backend comm ..... PASS / FAIL
[ ] Status updates ............ PASS / FAIL

Database Tests:
[ ] PostgreSQL running ........ PASS / FAIL
[ ] Migrations applied ........ PASS / FAIL
[ ] Prisma Studio ............. PASS / FAIL

Overall Status: ✅ READY TO DEVELOP / ❌ NEEDS FIXES

Notes:
_________________________________
_________________________________
```

---

## 🎉 Success Criteria

**You're ready to start development when:**

1. ✅ All three services start without errors
2. ✅ Frontend shows all green status indicators
3. ✅ Backend health check returns success
4. ✅ AI service API docs are accessible
5. ✅ Database connection works
6. ✅ All test endpoints respond
7. ✅ No errors in console or terminal

**Congratulations! Your VistaraBI skeleton is ready! 🚀**

---

Need help? Check SETUP.md or contact your team members.
