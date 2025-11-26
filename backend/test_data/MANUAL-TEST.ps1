# ===========================================
# VISTARABI API - MANUAL TEST GUIDE
# ===========================================

Write-Host @"

=== STEP-BY-STEP API CALLS ===

IMPORTANT: Replace {PROJECT_ID} with your actual project ID!

===========================================
STEP 1: Upload Files
===========================================
"@ -ForegroundColor Cyan

Write-Host @"
curl -X POST http://localhost:5001/api/projects \
  -F "name=Test Project" \
  -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-customers.csv" \
  -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-products.csv" \
  -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-sales.csv"

"@ -ForegroundColor Yellow

Write-Host "👆 Copy the 'id' from the response - that's your PROJECT_ID!`n" -ForegroundColor Green

Write-Host @"
===========================================
STEP 2: Clean Data
===========================================
"@ -ForegroundColor Cyan

Write-Host @'
$projectId = "PASTE_PROJECT_ID_HERE"
Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/clean" -Method Post

'@ -ForegroundColor Yellow

Write-Host "Wait 15-20 seconds for cleaning to complete...`n" -ForegroundColor Green

Write-Host @"
===========================================
STEP 3: Auto-Complete (MAIN CALL!)
===========================================
"@ -ForegroundColor Cyan

Write-Host @'
$projectId = "PASTE_PROJECT_ID_HERE"
$result = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/auto-complete" -Method Post
$result.data | ConvertTo-Json -Depth 3

'@ -ForegroundColor Yellow

Write-Host "This does EVERYTHING: Domain, Relationships, View, KPIs, Dashboard!`n" -ForegroundColor Green

Write-Host @"
===========================================
STEP 4: View Dashboard
===========================================
"@ -ForegroundColor Cyan

Write-Host @'
$projectId = "PASTE_PROJECT_ID_HERE"
$dashboard = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/$projectId/dashboard" -Method Get
$dashboard.data.visualizations | Select-Object type, title

'@ -ForegroundColor Yellow

Write-Host @"

===========================================
EXAMPLE WITH REAL PROJECT ID:
===========================================

# 1. Upload (use curl above, get PROJECT_ID)
# Let's say you got: "abc123-def456-ghi789"

# 2. Clean
`$projectId = "abc123-def456-ghi789"
Invoke-RestMethod -Uri "http://localhost:5001/api/projects/`$projectId/clean" -Method Post

# 3. Wait 20 seconds
Start-Sleep -Seconds 20

# 4. Auto-complete
`$result = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/`$projectId/auto-complete" -Method Post
Write-Host "Domain: `$(`$result.data.domain.detected)"
Write-Host "Relationships: `$(`$result.data.relationships.count)"
Write-Host "KPIs: `$(`$result.data.kpis.feasibleCount)"

# 5. View dashboard
`$dashboard = Invoke-RestMethod -Uri "http://localhost:5001/api/projects/`$projectId/dashboard" -Method Get
`$dashboard.data.visualizations | ForEach-Object { Write-Host "`$(`$_.type): `$(`$_.title)" }

"@ -ForegroundColor White

Write-Host "`n===========================================`n" -ForegroundColor Cyan
