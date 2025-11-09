# 📝 Complete Setup & Data Viewing Guide

## Current Situation

✅ **Working:**
- Frontend built successfully (0 errors)
- Frontend dev server running on http://localhost:3001
- PostgreSQL database running
- All code implemented (backend, worker, frontend)

❌ **Not Working:**
- Backend server (requires Redis)
- Background worker (requires Redis)
- Redis not installed/running

## Fix It Now - 3 Simple Steps

### Step 1: Start Docker Desktop

1. **Press Windows key**
2. **Type "Docker Desktop"**
3. **Click to open**
4. **Wait** for green icon in system tray (30-60 seconds)

### Step 2: Start Redis & Backend

Open **PowerShell** and run:

```powershell
# Start Redis
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# Verify Redis
docker exec vistarabi-redis redis-cli ping
# Should see: PONG

# Start Backend (Terminal 1)
cd G:\Projects\VistaraBI\backend
npm run dev

# Wait for: "🚀 VistaraBI Backend running on port 5000"
```

### Step 3: Start Worker

Open **another PowerShell terminal**:

```powershell
cd G:\Projects\VistaraBI\backend
npm run worker

# Wait for: "🔄 Upload worker started"
```

## Test It Works

### Upload a File

1. **Open browser**: http://localhost:3001
2. **Drag and drop** a CSV, Excel, or JSON file
3. **Watch** the status change:
   - ⏳ Uploading (0-100%)
   - 📋 Queued
   - ⚙️ Processing
   - ✅ Completed

### View the Data

**Method 1: Prisma Studio (GUI)**

```powershell
cd backend
npx prisma studio
```

Opens http://localhost:5555
- Click **Upload** to see all uploads
- See status, file name, records processed

**Method 2: PostgreSQL (Actual Data)**

```powershell
psql -U vistarabi -d vistarabi -h localhost
# Password: password
```

Then:
```sql
-- See all uploads
SELECT "originalName", status, "recordsProcessed", "tableName" 
FROM "Upload" 
ORDER BY "createdAt" DESC;

-- Copy the tableName, then:
SELECT * FROM upload_1234567890 LIMIT 10;
```

## What If Docker Won't Start?

### Alternative: Install Redis Directly

**Option A: Chocolatey (Recommended)**

Open **PowerShell as Administrator**:

```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis
choco install redis-64 -y

# Start Redis
redis-server --service-start

# Verify
redis-cli ping
```

**Option B: Manual Download**

1. Download: https://github.com/microsoftarchive/redis/releases
2. Get `Redis-x64-3.0.504.msi`
3. Install it
4. Start Redis service

Then continue with Step 2 above (start backend and worker).

## Understanding the System

### Architecture

```
User Upload
    ↓
Frontend (React) → Port 3001
    ↓
Backend API → Port 5000
    ↓
Redis Queue → Port 6379
    ↓
Worker Process → Background
    ↓
PostgreSQL Database → Port 5432
    ├── Upload table (metadata)
    └── upload_xxx tables (actual data)
```

### What Each Component Does

**Frontend (Port 3001)**
- Drag and drop interface
- Shows upload progress
- Displays file status
- Polls backend for updates

**Backend (Port 5000)**
- Receives file uploads
- Saves to `backend/uploads/` folder
- Creates Upload record in database
- Queues job in Redis

**Redis (Port 6379)**
- Job queue (BullMQ)
- Holds pending uploads
- Enables background processing

**Worker (Background)**
- Reads jobs from Redis
- Parses files (CSV, Excel, JSON, XML)
- Creates dynamic tables
- Inserts data into PostgreSQL
- Updates Upload status

**PostgreSQL (Port 5432)**
- Stores Upload metadata
- Creates dynamic tables (one per upload)
- Holds all uploaded data

### Data Flow Example

1. **Upload `sales.csv`**:
   ```
   name,amount,date
   John,100,2025-01-01
   Jane,200,2025-01-02
   ```

2. **Backend saves as**:
   ```
   backend/uploads/1699564321123-sales.csv
   ```

3. **Upload record created**:
   ```sql
   Upload {
     id: "uuid-123"
     fileName: "1699564321123-sales.csv"
     originalName: "sales.csv"
     status: "queued"
     ...
   }
   ```

4. **Job queued in Redis**:
   ```
   bull:upload-processing:wait → job-123
   ```

5. **Worker picks up job**:
   ```
   Processing: sales.csv
   Parsed: 2 records
   ```

6. **Creates table**:
   ```sql
   CREATE TABLE upload_1699564321123 (
     id SERIAL PRIMARY KEY,
     name TEXT,
     amount TEXT,
     date TEXT,
     created_at TIMESTAMP
   )
   ```

7. **Inserts data**:
   ```sql
   INSERT INTO upload_1699564321123 (name, amount, date)
   VALUES ('John', '100', '2025-01-01'),
          ('Jane', '200', '2025-01-02');
   ```

8. **Updates Upload record**:
   ```sql
   UPDATE Upload SET
     status = 'completed',
     recordsProcessed = 2,
     totalRecords = 2,
     tableName = 'upload_1699564321123'
   WHERE id = 'uuid-123'
   ```

9. **Frontend polls** and shows ✅ Completed!

## Viewing Your Data

### Quick Reference

| What You Want | Tool | Command |
|---------------|------|---------|
| Upload metadata | Prisma Studio | `cd backend; npx prisma studio` |
| Actual data (GUI) | pgAdmin/DBeaver | Install and connect |
| Actual data (CLI) | psql | `psql -U vistarabi -d vistarabi` |
| API status | PowerShell | `Invoke-RestMethod http://localhost:5000/api/v1/upload` |
| Logs | Terminal | Look at backend/worker terminals |

### Common SQL Queries

```sql
-- List all uploads
SELECT id, "originalName", status, "recordsProcessed", "tableName"
FROM "Upload"
ORDER BY "createdAt" DESC;

-- View specific upload data
SELECT * FROM upload_1699564321123 LIMIT 10;

-- Count records
SELECT COUNT(*) FROM upload_1699564321123;

-- Find failed uploads
SELECT "originalName", "errorMessage"
FROM "Upload"
WHERE status = 'failed';

-- List all dynamic tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'upload_%';
```

## Troubleshooting

### Issue: "Backend won't start"

**Check:**
```powershell
# Is port 5000 free?
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

# If something is there:
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force
```

### Issue: "Worker not processing files"

**Check:**
```powershell
# Is Redis running?
docker exec vistarabi-redis redis-cli ping
# Should return: PONG

# Is worker running?
# Look at Terminal 2 - should say "Listening for upload jobs"

# Check Redis queue
docker exec -it vistarabi-redis redis-cli
LLEN bull:upload-processing:wait
# Should be 0 when idle
```

### Issue: "Upload status stuck at 'queued'"

**Reasons:**
1. Worker not running → Start worker
2. Redis not running → Start Redis
3. Worker crashed → Check worker logs

### Issue: "Can't find uploaded data"

**Solution:**
```sql
-- Get the table name
SELECT "tableName" FROM "Upload" WHERE id = 'your-upload-id';

-- Query that table
SELECT * FROM <tableName>;
```

### Issue: "Permission denied on database"

**Solution:**
```sql
-- Connect as postgres user
psql -U postgres

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vistarabi TO vistarabi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vistarabi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vistarabi;

\q
```

## Status Check Script

Save this as `check-system.ps1`:

```powershell
Write-Host "`n=== Vistara BI System Check ===" -ForegroundColor Cyan

# PostgreSQL
Write-Host "`n[1/5] PostgreSQL:" -ForegroundColor Yellow
$pg = Get-Service postgresql* | Where-Object {$_.Status -eq 'Running'}
if ($pg) { Write-Host "  ✅ Running" -ForegroundColor Green }
else { Write-Host "  ❌ Not running" -ForegroundColor Red }

# Redis
Write-Host "`n[2/5] Redis:" -ForegroundColor Yellow
$redis = docker ps --filter "name=vistarabi-redis" --format "{{.Status}}" 2>$null
if ($redis -match "Up") { Write-Host "  ✅ Running" -ForegroundColor Green }
else { Write-Host "  ❌ Not running - Run: docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine" -ForegroundColor Red }

# Backend
Write-Host "`n[3/5] Backend (Port 5000):" -ForegroundColor Yellow
$backend = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($backend) { Write-Host "  ✅ Running" -ForegroundColor Green }
else { Write-Host "  ❌ Not running - Run: cd backend; npm run dev" -ForegroundColor Red }

# Worker
Write-Host "`n[4/5] Worker:" -ForegroundColor Yellow
$worker = Get-Process node 2>$null | Where-Object { $_.CommandLine -like "*worker*" }
if ($worker) { Write-Host "  ✅ Running" -ForegroundColor Green }
else { Write-Host "  ❌ Not running - Run: cd backend; npm run worker" -ForegroundColor Red }

# Frontend
Write-Host "`n[5/5] Frontend (Port 3001):" -ForegroundColor Yellow
$frontend = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($frontend) { Write-Host "  ✅ Running" -ForegroundColor Green }
else { Write-Host "  ⚠️  Not running - Run: cd frontend; npm run dev" -ForegroundColor Yellow }

Write-Host "`n"
```

Run: `.\check-system.ps1`

## Environment Variables

Ensure `backend/.env` has:

```env
DATABASE_URL="postgresql://vistarabi:password@localhost:5432/vistarabi"
REDIS_URL="redis://localhost:6379"
NODE_ENV=development
PORT=5000
```

## Complete Fresh Start

If everything is broken:

```powershell
# 1. Kill all processes
Get-Process node | Stop-Process -Force
docker stop vistarabi-redis 2>$null
docker rm vistarabi-redis 2>$null

# 2. Start Redis
docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine

# 3. Setup database
cd backend
npx prisma generate
npx prisma migrate dev --name init

# 4. Terminal 1: Start backend
npm run dev

# 5. Terminal 2: Start worker
cd backend
npm run worker

# 6. Terminal 3: Start frontend (if needed)
cd frontend
npm run dev

# 7. Test
Start-Process "http://localhost:3001"
```

## Summary

### To Get Everything Working:

1. **Start Docker Desktop** (Windows key → "Docker Desktop")
2. **Run Redis**: `docker run -d --name vistarabi-redis -p 6379:6379 redis:7-alpine`
3. **Start Backend**: `cd backend; npm run dev` (Terminal 1)
4. **Start Worker**: `cd backend; npm run worker` (Terminal 2)
5. **Open Frontend**: http://localhost:3001

### To View Data:

1. **Upload metadata**: `cd backend; npx prisma studio` → http://localhost:5555
2. **Actual data**: `psql -U vistarabi -d vistarabi` → `SELECT * FROM upload_xxx`
3. **Or use pgAdmin/DBeaver** for a nice GUI

### Files to Reference:

- **Full troubleshooting**: `BACKEND_TROUBLESHOOTING.md`
- **Data viewing details**: `DATA_VIEWING_GUIDE.md`
- **Redis alternatives**: `REDIS_SETUP_OPTIONS.md`
- **This guide**: `COMPLETE_GUIDE.md`

---

## 🎯 Next Steps

1. [ ] Start Docker Desktop
2. [ ] Run the commands in "Fix It Now" section
3. [ ] Upload a test file
4. [ ] View data in Prisma Studio or psql
5. [ ] Install pgAdmin/DBeaver for better data viewing (optional)

**Need help?** Check `BACKEND_TROUBLESHOOTING.md` for detailed solutions!
