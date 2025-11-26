# VistaraBI API Usage Guide

## Base URL
```
http://localhost:5001
```

## Complete Workflow

### 1. Upload Files & Create Project

**Endpoint:** `POST /api/projects`

**Using PowerShell:**
```powershell
# Create project with 3 CSV files
$files = @(
    "C:\Projects\VistaraBI\backend\test_data\ideal-workflow-customers.csv",
    "C:\Projects\VistaraBI\backend\test_data\ideal-workflow-products.csv",
    "C:\Projects\VistaraBI\backend\test_data\ideal-workflow-sales.csv"
)

# Upload using multipart form (simplified)
curl.exe -X POST http://localhost:5001/api/projects `
    -F "name=My Test Project" `
    -F "description=Testing with 3 files" `
    -F "files=@$($files[0])" `
    -F "files=@$($files[1])" `
    -F "files=@$($files[2])"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "PROJECT_ID_HERE",
      "name": "My Test Project"
    },
    "uploads": [
      { "id": "upload-1", "fileName": "ideal-workflow-customers.csv" },
      { "id": "upload-2", "fileName": "ideal-workflow-products.csv" },
      { "id": "upload-3", "fileName": "ideal-workflow-sales.csv" }
    ]
  }
}
```

**Save the `PROJECT_ID` from the response!**

---

### 2. Clean Data

**Endpoint:** `POST /api/projects/{projectId}/clean`

**Using PowerShell:**
```powershell
$projectId = "YOUR_PROJECT_ID_HERE"

$response = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/clean" `
    -Method Post `
    -ContentType "application/json"

Write-Host "Cleaning Jobs: $($response.data.cleaningJobs.Count)"
```

**Wait 10-30 seconds for cleaning to complete**

---

### 3. Auto-Complete Everything (Domain → Relationships → View → KPIs → Dashboard)

**Endpoint:** `POST /api/projects/{projectId}/auto-complete`

**Using PowerShell:**
```powershell
$projectId = "YOUR_PROJECT_ID_HERE"

$response = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/auto-complete" `
    -Method Post `
    -ContentType "application/json"

Write-Host "Domain: $($response.data.domain.detected)"
Write-Host "Relationships: $($response.data.relationships.count)"
Write-Host "KPIs: $($response.data.kpis.feasibleCount)"
Write-Host "Dashboard: $($response.data.dashboard.visualizations.Count) charts"
```

**Using curl:**
```bash
curl -X POST http://localhost:5001/api/projects/{PROJECT_ID}/auto-complete \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": {
      "detected": "retail",
      "confidence": 0.95
    },
    "relationships": {
      "count": 2,
      "detected": [...]
    },
    "view": {
      "viewName": "unified_view_xxx"
    },
    "kpis": {
      "feasibleCount": 23,
      "totalKpisInLibrary": 23,
      "autoSelectedCount": 23
    },
    "dashboard": {
      "visualizations": [
        { "type": "pie", "title": "..." },
        { "type": "line", "title": "..." }
      ]
    }
  }
}
```

---

### 4. Get Dashboard

**Endpoint:** `GET /api/projects/{projectId}/dashboard`

**Using PowerShell:**
```powershell
$projectId = "YOUR_PROJECT_ID_HERE"

$dashboard = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/dashboard" -Method Get

Write-Host "Dashboard Title: $($dashboard.data.title)"
Write-Host "Visualizations:"
foreach ($viz in $dashboard.data.visualizations) {
    Write-Host "  - $($viz.type): $($viz.title)"
}
```

**Using curl:**
```bash
curl http://localhost:5001/api/projects/{PROJECT_ID}/dashboard
```

---

## Quick Test (Copy-Paste Ready)

```powershell
# Step 1: Upload files
$uploadResponse = curl.exe -X POST http://localhost:5001/api/projects `
    -F "name=Quick Test" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-customers.csv" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-products.csv" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-sales.csv" | ConvertFrom-Json

$projectId = $uploadResponse.data.project.id
Write-Host "Project ID: $projectId" -ForegroundColor Green

# Step 2: Clean
Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/clean" -Method Post | Out-Null
Write-Host "Cleaning started. Waiting 15 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 3: Auto-complete
$result = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/auto-complete" -Method Post
Write-Host "Domain: $($result.data.domain.detected)" -ForegroundColor Cyan
Write-Host "Relationships: $($result.data.relationships.count)" -ForegroundColor Cyan
Write-Host "KPIs: $($result.data.kpis.feasibleCount)" -ForegroundColor Cyan
Write-Host "Charts: $($result.data.dashboard.visualizations.Count)" -ForegroundColor Cyan

# Step 4: View dashboard
Write-Host "`nDashboard URL: http://localhost:3000/projects/$projectId/dashboard" -ForegroundColor Green
```

---

## Alternative: Individual Steps

If you prefer manual control:

### 3a. Detect Domain
```powershell
POST /api/projects/{projectId}/detect-domain
```

### 3b. Detect Relationships
```powershell
POST /api/projects/{projectId}/detect-relationships
```

### 3c. Create Unified View
```powershell
POST /api/projects/{projectId}/create-unified-view
```

### 3d. Extract KPIs
```powershell
POST /api/projects/{projectId}/extract-kpis
```

### 3e. Generate Dashboard
```powershell
POST /api/projects/{projectId}/generate-dashboard
```

**But using `/auto-complete` does all these in one call!**

---

## Troubleshooting

### Check if backend is running:
```powershell
curl http://localhost:5001/health
```

### Check project status:
```powershell
$projectId = "YOUR_PROJECT_ID"
Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId" -Method Get
```

### View cleaning job status:
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId" -Method Get
$response.data.cleaningJobs | Select-Object status, fileName
```

---

## Expected Results

- **Domain:** retail
- **Relationships:** 2 (sales→customers, sales→products)
- **KPIs:** 20-23 feasible
- **Charts:** 
  - 📊 Pie chart (category distribution)
  - 📈 Line chart (trend over time)
  - 📋 Metric cards (4-6 summary stats)
