# VistaraBI Complete Workflow Test Script
# This script tests the entire pipeline: Upload -> Clean -> Auto-Complete -> Dashboard

$baseUrl = "http://localhost:5001"
$testDataDir = "C:\Projects\VistaraBI\backend\test_data"

Write-Host "`n=== VistaraBI API Test Script ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Gray

# Step 1: Create Project and Upload Files
Write-Host "[1/4] Creating project and uploading files..." -ForegroundColor Yellow

$files = @(
    "$testDataDir\ideal-workflow-customers.csv",
    "$testDataDir\ideal-workflow-products.csv",
    "$testDataDir\ideal-workflow-sales.csv"
)

# Check files exist
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        Write-Host "ERROR: File not found: $file" -ForegroundColor Red
        exit 1
    }
}

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$bodyLines = @()

$bodyLines += "--$boundary"
$bodyLines += 'Content-Disposition: form-data; name="name"'
$bodyLines += ""
$bodyLines += "Test Project - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

$bodyLines += "--$boundary"
$bodyLines += 'Content-Disposition: form-data; name="description"'
$bodyLines += ""
$bodyLines += "Automated test with 3 CSV files"

foreach ($file in $files) {
    $fileName = Split-Path $file -Leaf
    $fileContent = [System.IO.File]::ReadAllBytes($file)
    $fileContentBase64 = [System.Convert]::ToBase64String($fileContent)
    
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"files`"; filename=`"$fileName`""
    $bodyLines += "Content-Type: text/csv"
    $bodyLines += ""
    $bodyLines += [System.Text.Encoding]::UTF8.GetString($fileContent)
}

$bodyLines += "--$boundary--"
$body = $bodyLines -join "`r`n"

try {
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body
    
    $projectId = $uploadResponse.data.project.id
    $uploadIds = $uploadResponse.data.uploads | ForEach-Object { $_.id }
    
    Write-Host "✓ Project created: $projectId" -ForegroundColor Green
    Write-Host "✓ Uploaded $($uploadIds.Count) files" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Failed to upload files" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 2: Clean Data
Write-Host "`n[2/4] Cleaning data..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

try {
    $cleanResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/clean" `
        -Method Post `
        -ContentType "application/json"
    
    Write-Host "✓ Cleaning started for $($cleanResponse.data.cleaningJobs.Count) files" -ForegroundColor Green
    
    # Wait for cleaning to complete
    Write-Host "Waiting for cleaning to complete..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    $allComplete = $false
    
    while ($waited -lt $maxWait -and -not $allComplete) {
        Start-Sleep -Seconds 3
        $waited += 3
        
        $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId" -Method Get
        $cleaningJobs = $statusResponse.data.cleaningJobs
        
        $completed = ($cleaningJobs | Where-Object { $_.status -eq 'completed' }).Count
        $total = $cleaningJobs.Count
        
        Write-Host "  Progress: $completed/$total files cleaned" -ForegroundColor Gray
        
        if ($completed -eq $total) {
            $allComplete = $true
            Write-Host "✓ All files cleaned successfully!" -ForegroundColor Green
        }
    }
    
    if (-not $allComplete) {
        Write-Host "WARNING: Cleaning timeout. Proceeding anyway..." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: Failed to clean data" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Step 3: Auto-Complete (Domain -> Relationships -> View -> KPIs -> Dashboard)
Write-Host "`n[3/4] Running auto-complete pipeline..." -ForegroundColor Yellow

try {
    $autoCompleteResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/auto-complete" `
        -Method Post `
        -ContentType "application/json"
    
    $domain = $autoCompleteResponse.data.domain.detected
    $relCount = $autoCompleteResponse.data.relationships.count
    $kpiCount = $autoCompleteResponse.data.kpis.feasibleCount
    $viewName = $autoCompleteResponse.data.view.viewName
    
    Write-Host "✓ Domain detected: $domain" -ForegroundColor Green
    Write-Host "✓ Relationships found: $relCount" -ForegroundColor Green
    Write-Host "✓ Unified view created: $viewName" -ForegroundColor Green
    Write-Host "✓ KPIs extracted: $kpiCount" -ForegroundColor Green
    Write-Host "✓ Dashboard generated!" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR: Auto-complete failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response | ConvertTo-Json -Depth 5)" -ForegroundColor Gray
    exit 1
}

# Step 4: Get Dashboard
Write-Host "`n[4/4] Fetching dashboard..." -ForegroundColor Yellow

try {
    $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/projects/$projectId/dashboard" `
        -Method Get
    
    $vizCount = $dashboardResponse.data.visualizations.Count
    $chartTypes = $dashboardResponse.data.visualizations | ForEach-Object { $_.type } | Select-Object -Unique
    
    Write-Host "✓ Dashboard retrieved" -ForegroundColor Green
    Write-Host "  Visualizations: $vizCount" -ForegroundColor Cyan
    Write-Host "  Chart types: $($chartTypes -join ', ')" -ForegroundColor Cyan
    
    # Display chart details
    Write-Host "`n  Charts:" -ForegroundColor Cyan
    foreach ($viz in $dashboardResponse.data.visualizations) {
        if ($viz.type -ne 'metric') {
            Write-Host "    - $($viz.type): $($viz.title)" -ForegroundColor White
        }
    }
    
} catch {
    Write-Host "ERROR: Failed to get dashboard" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Summary
Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Project ID: $projectId" -ForegroundColor White
Write-Host "Domain: $domain" -ForegroundColor White
Write-Host "Relationships: $relCount" -ForegroundColor White
Write-Host "KPIs: $kpiCount" -ForegroundColor White
Write-Host "Visualizations: $vizCount" -ForegroundColor White
Write-Host "`nDashboard URL: http://localhost:3000/projects/$projectId/dashboard`n" -ForegroundColor Green
