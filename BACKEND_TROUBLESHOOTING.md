# 🔧 Backend Troubleshooting & Setup Guide

## Current Issues Found

### ❌ Redis Not Running
Redis is required for the background job queue (BullMQ) but is not installed or running.

### ⚠️ Port 5000 Already in Use
Backend server was already running or another process is using port 5000.

## Quick Fix - Start Backend Now!

### Option 1: Run Without Docker (Redis via Docker)

Since you have Docker available, let's use it just for Redis:

```powershell
# Step 1: Start Redis in Docker
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# Step 2: Verify Redis is running
docker ps | findstr redis

# Step 3: Test Redis connection
docker exec vistarabi-redis redis-cli ping
# Should return: PONG

# Step 4: Start Backend Server (new terminal)
cd backend
npm run dev

# Step 5: Start Worker (another new terminal)
cd backend
npm run worker
```

### Option 2: Install Redis on Windows

**Download Redis:**
1. Go to https://github.com/microsoftarchive/redis/releases
2. Download Redis-x64-3.0.504.msi
3. Install Redis
4. Start Redis service

**Or use WSL2:**
```powershell
wsl
sudo apt-get update
sudo apt-get install redis-server
redis-server --daemonize yes
redis-cli ping
```

### Option 3: Use Full Docker Setup

```powershell
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy
docker-compose ps

# Run migrations
cd backend
npx prisma migrate dev

# Start backend (outside Docker)
npm run dev

# Start worker (another terminal)
npm run worker
```

## Step-by-Step Complete Setup

### 1️⃣ Check Prerequisites

```powershell
# Check PostgreSQL
Get-Service postgresql*

# Should show: Running

# Check if port 5000 is free
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# If something is there, kill it:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
```

### 2️⃣ Start Redis (Choose One Method)

**Method A: Docker (Recommended)**
```powershell
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine
```

**Method B: WSL2**
```powershell
wsl
redis-server --daemonize yes
exit
```

**Verify Redis:**
```powershell
# If using Docker
docker exec vistarabi-redis redis-cli ping

# If using WSL
wsl redis-cli ping

# Should return: PONG
```

### 3️⃣ Setup Database

```powershell
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Verify database
npx prisma studio
# Opens at http://localhost:5555
# You should see the "Upload" model
```

### 4️⃣ Start Backend Server

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Expected Output:**
```
🚀 VistaraBI Backend running on port 5000
📊 Environment: development
🔗 API available at: http://localhost:5000
📁 Upload directory: G:\Projects\VistaraBI\backend\uploads
```

**If you see errors:**
- Port in use: Kill process using port 5000
- Database error: Check PostgreSQL is running and credentials
- Redis error: Make sure Redis is running

### 5️⃣ Start Background Worker

**Terminal 2 - Worker:**
```powershell
cd backend
npm run worker
```

**Expected Output:**
```
🔄 Upload worker started
📡 Listening for upload jobs...
```

### 6️⃣ Verify Everything Works

**Test Backend Health:**
```powershell
# In browser or new terminal
Invoke-RestMethod http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-09T..."
}
```

## Common Issues & Solutions

### ❌ Issue: "EADDRINUSE: address already in use :::5000"

**Solution:**
```powershell
# Find what's using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

# Kill that process
Stop-Process -Id <PID> -Force

# Or kill all node processes
Get-Process node | Stop-Process -Force

# Then restart backend
npm run dev
```

### ❌ Issue: "Redis connection refused"

**Solution:**
```powershell
# Start Redis with Docker
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# Or check if Redis container exists but is stopped
docker start vistarabi-redis

# Verify it's running
docker ps | findstr redis
```

### ❌ Issue: "Can't reach database server"

**Solution:**
```powershell
# Check PostgreSQL service
Get-Service postgresql-x64-15

# Start if stopped
Start-Service postgresql-x64-15

# Test connection
psql -U vistarabi -d vistarabi -h localhost

# If database doesn't exist, create it:
psql -U postgres
CREATE DATABASE vistarabi;
CREATE USER vistarabi WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE vistarabi TO vistarabi;
\q
```

### ❌ Issue: "Prisma Client not generated"

**Solution:**
```powershell
cd backend
npx prisma generate
npx prisma migrate dev
```

### ❌ Issue: "Worker not processing files"

**Check:**
1. Redis is running
2. Worker terminal shows no errors
3. Backend is running

**Solution:**
```powershell
# Restart Redis
docker restart vistarabi-redis

# Restart worker
# Ctrl+C in worker terminal, then:
npm run worker

# Check Redis connection in worker logs
```

### ❌ Issue: "File upload fails immediately"

**Check:**
1. Backend logs for errors
2. `backend/uploads` directory exists
3. File permissions

**Solution:**
```powershell
# Create uploads directory if missing
cd backend
New-Item -ItemType Directory -Path uploads -Force

# Check backend logs for specific error
```

## Monitoring & Debugging

### View Backend Logs

Backend logs show in Terminal 1. Look for:
```
✅ POST /api/v1/upload 202 - File uploaded
✅ GET /api/v1/upload/<id>/status 200 - Status check
❌ Errors if something fails
```

### View Worker Logs

Worker logs show in Terminal 2. Look for:
```
✅ Processing file: sample.csv (text/csv)
✅ Parsed 10 records from sample.csv
✅ Created table: upload_xxx
✅ Processed 10/10 records
✅ Job <id> completed successfully
```

### Check Database

```powershell
cd backend
npx prisma studio
```

This opens a GUI at http://localhost:5555 where you can:
- View all uploads
- See upload status
- Check dynamic tables
- Verify data

### Check Redis Queue

```powershell
# If using Docker
docker exec -it vistarabi-redis redis-cli

# Then in Redis CLI:
KEYS *
# Shows all keys

LLEN bull:upload-processing:wait
# Shows waiting jobs

LLEN bull:upload-processing:active
# Shows active jobs

LLEN bull:upload-processing:completed
# Shows completed jobs

exit
```

### Check Upload Files

```powershell
# List uploaded files
Get-ChildItem backend\uploads

# Check file details
Get-ChildItem backend\uploads | Format-Table Name, Length, LastWriteTime
```

## Testing the Backend

### Test 1: Health Check

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected: `{"status":"ok"}`

### Test 2: Upload a File

```powershell
$file = Get-Item "test_data\sample.csv"
$form = @{
    file = $file
}
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/upload" -Method Post -Form $form
$response
```

Expected:
```json
{
  "message": "File uploaded successfully and queued for processing",
  "uploadId": "uuid-here",
  "fileName": "sample.csv",
  "fileSize": 1234,
  "status": "queued"
}
```

### Test 3: Check Status

```powershell
# Use the uploadId from Test 2
$uploadId = "uuid-here"
Invoke-RestMethod "http://localhost:5000/api/v1/upload/$uploadId/status"
```

Expected:
```json
{
  "id": "uuid",
  "status": "completed",
  "recordsProcessed": 10,
  "totalRecords": 10,
  "tableName": "upload_xxx"
}
```

### Test 4: List All Uploads

```powershell
Invoke-RestMethod "http://localhost:5000/api/v1/upload"
```

## Quick Commands Reference

```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Start Redis (Docker)
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# Check Redis
docker exec vistarabi-redis redis-cli ping

# Start PostgreSQL
Start-Service postgresql-x64-15

# Generate Prisma Client
cd backend; npx prisma generate

# Run migrations
cd backend; npx prisma migrate dev

# Start backend
cd backend; npm run dev

# Start worker
cd backend; npm run worker

# Open Prisma Studio
cd backend; npx prisma studio

# Test backend
Invoke-RestMethod http://localhost:5000/api/health
```

## Complete Fresh Start

If everything is broken, start from scratch:

```powershell
# 1. Kill everything
Get-Process node | Stop-Process -Force
docker stop vistarabi-redis 2>$null
docker rm vistarabi-redis 2>$null

# 2. Start Redis
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# 3. Setup database
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init

# 4. Start backend (Terminal 1)
npm run dev

# 5. Start worker (Terminal 2 - open new terminal)
cd backend
npm run worker

# 6. Start frontend (Terminal 3 - open new terminal)
cd frontend
npm run dev

# 7. Test
# Open http://localhost:3001
# Upload test_data/sample.csv
```

## Visual Guide - What Should Be Running

```
Terminal 1: Backend Server
├── Port: 5000
├── Status: 🚀 VistaraBI Backend running
└── Logs: API requests

Terminal 2: Background Worker
├── Connected to: Redis
├── Status: 📡 Listening for upload jobs
└── Logs: File processing

Terminal 3: Frontend
├── Port: 3001 (or 3000)
├── Status: ➜  Local: http://localhost:3001
└── Logs: Vite dev server

Services:
├── PostgreSQL: Running on 5432
└── Redis: Running on 6379 (Docker)
```

## Need Help?

### Check Status Script

Save this as `check-status.ps1`:

```powershell
Write-Host "`n=== Vistara BI Status Check ===" -ForegroundColor Cyan

# Check PostgreSQL
Write-Host "`n📊 PostgreSQL:" -ForegroundColor Yellow
$pg = Get-Service postgresql* | Where-Object {$_.Status -eq 'Running'}
if ($pg) {
    Write-Host "  ✅ Running: $($pg.Name)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

# Check Redis
Write-Host "`n🔴 Redis:" -ForegroundColor Yellow
$redis = docker ps --filter "name=vistarabi-redis" --format "{{.Status}}" 2>$null
if ($redis -match "Up") {
    Write-Host "  ✅ Running (Docker)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

# Check Backend
Write-Host "`n🔧 Backend (Port 5000):" -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backend) {
    Write-Host "  ✅ Running" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

# Check Frontend
Write-Host "`n🌐 Frontend (Port 3001):" -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($frontend) {
    Write-Host "  ✅ Running" -ForegroundColor Green
} else {
    Write-Host "  ❌ Not running" -ForegroundColor Red
}

Write-Host "`n"
```

Run with: `.\check-status.ps1`

---

## 🎯 Quick Start (Most Common Path)

```powershell
# 1. Start Redis
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# 2. Backend (Terminal 1)
cd backend
npm run dev

# 3. Worker (Terminal 2)
cd backend
npm run worker

# 4. Frontend (Terminal 3)
cd frontend
npm run dev

# 5. Open Browser
Start-Process "http://localhost:3001"
```

**That's it!** Upload a file and watch it work! 🚀
