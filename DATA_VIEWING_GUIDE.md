# 📊 How to View Your Uploaded Data

This guide shows you exactly how to see the data from uploaded files in your database.

## Understanding Data Storage

When you upload a file:
1. **Upload Record** - Created in `Upload` table (metadata)
2. **Dynamic Table** - New table created with actual data (e.g., `upload_abc123`)
3. **Background Processing** - Worker processes file asynchronously

## Method 1: Prisma Studio (Visual Interface) ⭐ Recommended

### Start Prisma Studio

```powershell
cd backend
npx prisma studio
```

This opens a web interface at **http://localhost:5555**

### What You'll See

```
📋 Models
├── Upload (Click this to see all uploads)
```

### View Upload Metadata

1. Click on **Upload** model
2. You'll see a table with columns:
   - `id` - Unique upload ID
   - `fileName` - Generated filename (e.g., 1699564321123-sample.csv)
   - `originalName` - Original filename
   - `fileType` - MIME type
   - `fileSize` - Size in bytes
   - `status` - queued → processing → completed/failed
   - `recordsProcessed` - How many rows processed
   - `totalRecords` - Total rows in file
   - `tableName` - Name of dynamic table with data
   - `errorMessage` - If failed, why
   - `createdAt` - When uploaded
   - `updatedAt` - Last status update

### View Actual Data

**Problem**: Dynamic tables (like `upload_abc123`) won't show in Prisma Studio because they're not in the schema.

**Solution**: Use PostgreSQL directly (see Method 2 below)

## Method 2: PostgreSQL Direct Access

### Using pgAdmin

1. **Open pgAdmin** (if installed)
2. **Connect to Server**:
   - Host: `localhost`
   - Port: `5432`
   - Database: `vistarabi`
   - Username: `vistarabi`
   - Password: `password`
3. **Browse**:
   - Servers → PostgreSQL 15 → Databases → vistarabi → Schemas → public → Tables
4. **Find Your Table**:
   - Look for `upload_[timestamp]` tables
   - Right-click → View/Edit Data → All Rows

### Using psql (Command Line)

```powershell
# Connect to database
psql -U vistarabi -d vistarabi -h localhost

# Password: password
```

**Once connected:**

```sql
-- List all tables
\dt

-- You'll see:
--  public | Upload           | table | vistarabi
--  public | upload_1699564321 | table | vistarabi
--  public | upload_1699564322 | table | vistarabi

-- View Upload metadata
SELECT id, "originalName", status, "recordsProcessed", "tableName" 
FROM "Upload" 
ORDER BY "createdAt" DESC;

-- Find the tableName for your upload, then:
SELECT * FROM upload_1699564321 LIMIT 10;

-- Count records
SELECT COUNT(*) FROM upload_1699564321;

-- See table structure
\d upload_1699564321

-- Exit
\q
```

### Using DBeaver (Free Universal Database Tool)

1. **Download**: https://dbeaver.io/download/
2. **Install and Open**
3. **New Connection**:
   - Database: PostgreSQL
   - Host: localhost
   - Port: 5432
   - Database: vistarabi
   - Username: vistarabi
   - Password: password
4. **Browse**:
   - vistarabi → public → Tables
   - Double-click any table to view data

## Method 3: Backend API Endpoints

### Get All Uploads

```powershell
Invoke-RestMethod http://localhost:5000/api/v1/upload | ConvertTo-Json
```

**Response:**
```json
[
  {
    "id": "uuid-here",
    "fileName": "1699564321123-sample.csv",
    "originalName": "sample.csv",
    "fileType": "text/csv",
    "fileSize": "1234",
    "status": "completed",
    "recordsProcessed": "10",
    "totalRecords": "10",
    "tableName": "upload_1699564321123",
    "createdAt": "2025-11-09T10:30:00.000Z"
  }
]
```

### Get Specific Upload Status

```powershell
$uploadId = "your-upload-id"
Invoke-RestMethod "http://localhost:5000/api/v1/upload/$uploadId/status"
```

### Query Dynamic Table Data (Need Custom Endpoint)

Currently, there's no API endpoint to query the dynamic tables. You need to use PostgreSQL directly.

**Want an API endpoint?** I can add one:

```javascript
// GET /api/v1/upload/:id/data
// Returns actual data from the dynamic table
```

## Method 4: Frontend UI

### Upload Status

The frontend shows:
- ✅ File upload progress
- ✅ Processing status
- ✅ Records processed
- ❌ But NOT the actual data

### View in Browser

1. Open http://localhost:3001
2. Upload a file
3. Watch status change: Uploading → Queued → Processing → Completed
4. You'll see "Processed X/Y records"

**Limitation**: Frontend doesn't show the actual data yet. You need to use PostgreSQL or Prisma Studio.

## Complete Workflow Example

### Step 1: Upload a File

```powershell
# Via Frontend
Open browser to http://localhost:3001
Drag and drop test_data/sample.csv

# Or via API
$file = Get-Item "test_data\sample.csv"
$form = @{ file = $file }
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/upload" -Method Post -Form $form
$uploadId = $response.uploadId
Write-Host "Upload ID: $uploadId"
```

### Step 2: Wait for Processing

```powershell
# Check status
Invoke-RestMethod "http://localhost:5000/api/v1/upload/$uploadId/status"

# Keep checking until status is "completed"
```

### Step 3: Get Table Name

```powershell
$status = Invoke-RestMethod "http://localhost:5000/api/v1/upload/$uploadId/status"
$tableName = $status.tableName
Write-Host "Data is in table: $tableName"
```

### Step 4: View Data

**Option A - Prisma Studio:**
```powershell
cd backend
npx prisma studio
# Opens http://localhost:5555
# Click "Upload" to see metadata
# Note: Can't see dynamic tables here
```

**Option B - PostgreSQL:**
```powershell
psql -U vistarabi -d vistarabi -h localhost
# Password: password

# Then:
SELECT * FROM upload_1699564321123 LIMIT 10;
```

**Option C - pgAdmin/DBeaver:**
Open GUI → Navigate to `vistarabi` database → Find table → View data

## Adding Data Viewer to Frontend

Want to see data in the UI? Here's what we can add:

### New Feature: Data Preview Component

```typescript
// frontend/src/components/DataPreview.tsx
// Shows first 10 rows of uploaded data
```

### New API Endpoint

```javascript
// backend/src/routes/upload.js
// GET /api/v1/upload/:id/data?limit=10&offset=0
// Returns: { columns: [], rows: [], total: 100 }
```

**Should I implement this?** Say yes and I'll add a data viewer to the frontend! 📊

## Troubleshooting

### Issue: "Can't find my uploaded data"

**Solution:**
1. Check upload status is "completed"
2. Get the tableName from Upload record
3. Query that specific table in PostgreSQL

```sql
-- Find all dynamic tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'upload_%';

-- Get the latest one
SELECT "tableName" 
FROM "Upload" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

### Issue: "Table exists but has no data"

**Solution:**
Check the Upload record:
```sql
SELECT status, "recordsProcessed", "errorMessage" 
FROM "Upload" 
WHERE "tableName" = 'upload_xxx';
```

If status is "failed", check errorMessage.

### Issue: "Upload status stuck at 'processing'"

**Solution:**
1. Check worker is running
2. Check worker logs for errors
3. Check Redis is running

```powershell
# Check worker
# Should see logs in Terminal 2

# Check Redis
docker exec vistarabi-redis redis-cli ping
# Should return: PONG

# Check if job is stuck
docker exec -it vistarabi-redis redis-cli
LLEN bull:upload-processing:active
# Should be 0 when done
```

## Quick SQL Queries

### List All Uploads
```sql
SELECT 
  id,
  "originalName",
  status,
  "recordsProcessed",
  "totalRecords",
  "tableName",
  "createdAt"
FROM "Upload"
ORDER BY "createdAt" DESC;
```

### Get Latest Upload's Data
```sql
-- Step 1: Get latest table name
SELECT "tableName" FROM "Upload" ORDER BY "createdAt" DESC LIMIT 1;

-- Step 2: Query that table (replace 'upload_xxx' with actual name)
SELECT * FROM upload_xxx LIMIT 10;
```

### Count Records in All Upload Tables
```sql
-- Get all upload tables
SELECT 
  "tableName",
  "recordsProcessed"
FROM "Upload"
WHERE status = 'completed'
ORDER BY "createdAt" DESC;

-- Then for each table:
SELECT COUNT(*) as total FROM upload_xxx;
```

### Find Failed Uploads
```sql
SELECT 
  "originalName",
  "errorMessage",
  "createdAt"
FROM "Upload"
WHERE status = 'failed'
ORDER BY "createdAt" DESC;
```

### Export Data to CSV
```sql
-- In psql
\copy (SELECT * FROM upload_xxx) TO 'C:\temp\export.csv' CSV HEADER;
```

## Database Schema Reference

### Upload Table
```sql
CREATE TABLE "Upload" (
  id TEXT PRIMARY KEY,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  "recordsProcessed" INTEGER,
  "totalRecords" INTEGER,
  "tableName" TEXT,
  "errorMessage" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
```

### Dynamic Tables
```sql
-- Example: upload_1699564321123
-- Columns are auto-detected from your file
CREATE TABLE "upload_1699564321123" (
  id SERIAL PRIMARY KEY,
  column1 TEXT,
  column2 TEXT,
  column3 TEXT,
  -- ... more columns based on your CSV headers
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## PowerShell Helper Script

Save this as `view-data.ps1`:

```powershell
param(
    [Parameter(Mandatory=$false)]
    [string]$UploadId
)

$baseUrl = "http://localhost:5000/api/v1/upload"

if ($UploadId) {
    # Show specific upload
    $upload = Invoke-RestMethod "$baseUrl/$UploadId/status"
    Write-Host "`n📊 Upload Details:" -ForegroundColor Cyan
    Write-Host "  ID: $($upload.id)"
    Write-Host "  File: $($upload.originalName)"
    Write-Host "  Status: $($upload.status)" -ForegroundColor $(if($upload.status -eq 'completed'){'Green'}else{'Yellow'})
    Write-Host "  Records: $($upload.recordsProcessed)/$($upload.totalRecords)"
    Write-Host "  Table: $($upload.tableName)"
    
    if ($upload.tableName) {
        Write-Host "`n💾 To view data, run:" -ForegroundColor Yellow
        Write-Host "  psql -U vistarabi -d vistarabi -c 'SELECT * FROM $($upload.tableName) LIMIT 10;'"
    }
} else {
    # List all uploads
    $uploads = Invoke-RestMethod $baseUrl
    Write-Host "`n📋 Recent Uploads:" -ForegroundColor Cyan
    $uploads | Format-Table @{L='File';E={$_.originalName}}, status, recordsProcessed, totalRecords, tableName -AutoSize
    
    Write-Host "`nRun with -UploadId <id> to see details" -ForegroundColor Yellow
}
```

**Usage:**
```powershell
# List all uploads
.\view-data.ps1

# View specific upload
.\view-data.ps1 -UploadId "your-upload-id"
```

---

## 🎯 Recommended Workflow

1. **Upload File** → Frontend UI (http://localhost:3001)
2. **View Metadata** → Prisma Studio (http://localhost:5555)
3. **View Actual Data** → pgAdmin or DBeaver GUI
4. **Quick Queries** → psql command line

## Next Steps

- [ ] Install pgAdmin or DBeaver for easy data viewing
- [ ] Bookmark Prisma Studio (http://localhost:5555)
- [ ] Save SQL queries for common tasks
- [ ] Consider adding data preview to frontend UI

**Need the data viewer in frontend?** Let me know and I'll build it! 🚀
