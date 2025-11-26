# Test multi-file upload and finalize

Write-Host "Testing Multi-File Intelligence Pipeline" -ForegroundColor Cyan
Write-Host "========================================`n"

# API endpoint
$baseUrl = "http://localhost:5001/api"

# Create project with 3 files
Write-Host "Step 1: Uploading 3 CSV files (customers, products, sales)..." -ForegroundColor Yellow

$files = @(
    "C:\Projects\VistaraBI\backend\test_data\customers.csv",
    "C:\Projects\VistaraBI\backend\test_data\products.csv",
    "C:\Projects\VistaraBI\backend\test_data\sales.csv"
)

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$headers = @{
    "Content-Type" = "multipart/form-data; boundary=$boundary"
}

# Build multipart body
$bodyLines = @()
$bodyLines += "--$boundary"
$bodyLines += 'Content-Disposition: form-data; name="name"'
$bodyLines += ''
$bodyLines += 'Test E-Commerce Project'
$bodyLines += "--$boundary"
$bodyLines += 'Content-Disposition: form-data; name="description"'
$bodyLines += ''
$bodyLines += 'Testing multi-file intelligence with customers, products, and sales data'

foreach ($file in $files) {
    $fileName = Split-Path $file -Leaf
    $fileContent = [System.IO.File]::ReadAllBytes($file)
    $bodyLines += "--$boundary"
    $bodyLines += "Content-Disposition: form-data; name=`"files`"; filename=`"$fileName`""
    $bodyLines += "Content-Type: text/csv"
    $bodyLines += ''
    $bodyLines += [System.Text.Encoding]::UTF8.GetString($fileContent)
}

$bodyLines += "--$boundary--"
$body = $bodyLines -join "`r`n"

try {
    $uploadResponse = Invoke-RestMethod -Uri "$baseUrl/projects" -Method Post -Headers $headers -Body $body
    Write-Host "✓ Upload successful!" -ForegroundColor Green
    Write-Host "Project ID: $($uploadResponse.data.projectId)" -ForegroundColor Green
    Write-Host "Files uploaded: $($uploadResponse.data.fileCount)"
    Write-Host "Total records: $($uploadResponse.data.totalRecords)`n"
    
    $projectId = $uploadResponse.data.projectId
    
    # Step 2: Finalize project
    Write-Host "Step 2: Triggering multi-file intelligence pipeline..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $finalizeResponse = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/finalize" -Method Post
    Write-Host "✓ Pipeline started!" -ForegroundColor Green
    Write-Host "Status: $($finalizeResponse.data.status)`n"
    
    # Wait for processing
    Write-Host "Step 3: Waiting for processing to complete..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Get results
    Write-Host "Step 4: Fetching results..." -ForegroundColor Yellow
    $resultsResponse = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/results" -Method Get
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "RESULTS" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Project Status: $($resultsResponse.data.project.status)"
    Write-Host "Domain: $($resultsResponse.data.project.domain)"
    Write-Host "Relationships Found: $($resultsResponse.data.relationships.Count)"
    
    if ($resultsResponse.data.relationships.Count -gt 0) {
        Write-Host "`nDetected Relationships:" -ForegroundColor Green
        foreach ($rel in $resultsResponse.data.relationships) {
            Write-Host "  • $($rel.sourceTable).$($rel.sourceColumn) → $($rel.targetTable).$($rel.targetColumn) [$($rel.matchRate)% match]"
        }
    }
    
    Write-Host "`nUnified Views: $($resultsResponse.data.unifiedViews.Count)"
    if ($resultsResponse.data.unifiedViews.Count -gt 0) {
        foreach ($view in $resultsResponse.data.unifiedViews) {
            Write-Host "  • View: $($view.viewName)" -ForegroundColor Green
        }
    }
    
    Write-Host "`nKPIs: $($resultsResponse.data.kpis.Count)"
    Write-Host "`n✓ Test completed successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
