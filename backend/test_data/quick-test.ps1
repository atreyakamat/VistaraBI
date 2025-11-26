# VistaraBI Simple Test Script
$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5001"

Write-Host "`n=== VISTARABI API TEST ===" -ForegroundColor Cyan
Write-Host "Testing complete workflow...`n"

# Test 1: Upload Files
Write-Host "[1/4] Uploading 3 CSV files..." -ForegroundColor Yellow

$response = curl.exe -X POST "$baseUrl/api/projects" `
    -F "name=PowerShell Test Project" `
    -F "description=Test with 3 CSV files" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-customers.csv" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-products.csv" `
    -F "files=@C:\Projects\VistaraBI\backend\test_data\ideal-workflow-sales.csv" | ConvertFrom-Json

if ($response.success) {
    $projectId = $response.data.project.id
    Write-Host "✓ Project created: $projectId" -ForegroundColor Green
    Write-Host "✓ Files uploaded: $($response.data.uploads.Count)" -ForegroundColor Green
} else {
    Write-Host "✗ Upload failed!" -ForegroundColor Red
    exit 1
}

# Test 2: Clean Data
Write-Host "`n[2/4] Cleaning data..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$cleanResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/clean" -Method Post

Write-Host "✓ Cleaning started for $($cleanResponse.data.cleaningJobs.Count) files" -ForegroundColor Green
Write-Host "Waiting 20 seconds for cleaning to complete..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# Test 3: Auto-Complete
Write-Host "`n[3/4] Running auto-complete..." -ForegroundColor Yellow

$autoResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/auto-complete" -Method Post

Write-Host "✓ Domain: $($autoResponse.data.domain.detected)" -ForegroundColor Green
Write-Host "✓ Relationships: $($autoResponse.data.relationships.count)" -ForegroundColor Green
Write-Host "✓ KPIs: $($autoResponse.data.kpis.feasibleCount)" -ForegroundColor Green
Write-Host "✓ Dashboard: $($autoResponse.data.dashboard.visualizations.Count) visualizations" -ForegroundColor Green

# Test 4: Get Dashboard
Write-Host "`n[4/4] Fetching dashboard..." -ForegroundColor Yellow

$dashboard = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/dashboard" -Method Get

Write-Host "✓ Dashboard retrieved" -ForegroundColor Green
Write-Host "`nVisualizations:" -ForegroundColor Cyan
foreach ($viz in $dashboard.data.visualizations) {
    Write-Host "  • $($viz.type): $($viz.title)" -ForegroundColor White
}

Write-Host "`n=== SUCCESS ===" -ForegroundColor Green
Write-Host "Project ID: $projectId"
Write-Host "Dashboard URL: http://localhost:3000/projects/$projectId/dashboard`n"
