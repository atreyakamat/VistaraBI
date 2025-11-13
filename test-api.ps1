# Test script to verify backend API endpoints
# Run with: powershell -File test-api.ps1

$API_BASE = "http://localhost:5001/api/v1"

Write-Host "🧪 Testing Backend API Endpoints" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "📡 Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/../health" -Method GET -UseBasicParsing
    Write-Host "✅ Backend is responding" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure backend is running on port 5001" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Check if there are any uploads
Write-Host "📂 Test 2: Checking for existing uploads" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/upload" -Method GET -UseBasicParsing
    if ($response.data.Count -gt 0) {
        Write-Host "✅ Found $($response.data.Count) existing uploads" -ForegroundColor Green
        $firstUpload = $response.data[0]
        Write-Host "   Latest upload ID: $($firstUpload.id)" -ForegroundColor Gray
        Write-Host "   File name: $($firstUpload.originalName)" -ForegroundColor Gray
        Write-Host "   Rows: $($firstUpload.rowCount)" -ForegroundColor Gray
        
        $testUploadId = $firstUpload.id
    } else {
        Write-Host "⚠️  No uploads found in database" -ForegroundColor Yellow
        Write-Host "   You need to upload a file first through the UI" -ForegroundColor Gray
        exit 0
    }
} catch {
    Write-Host "❌ Failed to fetch uploads: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Check for cleaning jobs
Write-Host "🧹 Test 3: Checking for cleaning jobs" -ForegroundColor Yellow
try {
    # This is a workaround - we'll try to get a specific job if we know an ID
    # For now, let's skip this and try auto-config
    Write-Host "⏭️  Skipping - will test with auto-config instead" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not check cleaning jobs" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Try auto-config on existing upload
Write-Host "⚙️  Test 4: Testing auto-config endpoint" -ForegroundColor Yellow
try {
    $body = @{ uploadId = $testUploadId } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$API_BASE/clean/auto-config" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    if ($response.success) {
        Write-Host "✅ Auto-config working" -ForegroundColor Green
        Write-Host "   Imputation columns: $($response.data.imputation.PSObject.Properties.Count)" -ForegroundColor Gray
        Write-Host "   Outliers enabled: $($response.data.outliers.enabled)" -ForegroundColor Gray
        Write-Host "   Dedup enabled: $($response.data.deduplication.enabled)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Auto-config failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Start a cleaning job
Write-Host "🚀 Test 5: Starting cleaning job" -ForegroundColor Yellow
try {
    $body = @{ 
        uploadId = $testUploadId 
        config = @{
            imputation = @{}
            outliers = @{ enabled = $true }
            deduplication = @{ enabled = $true }
        }
    } | ConvertTo-Json -Depth 5
    
    $response = Invoke-RestMethod -Uri "$API_BASE/clean" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    if ($response.success) {
        $jobId = $response.data.jobId
        Write-Host "✅ Cleaning job started" -ForegroundColor Green
        Write-Host "   Job ID: $jobId" -ForegroundColor Gray
        Write-Host "   Status: $($response.data.status)" -ForegroundColor Gray
        
        # Wait a bit for it to complete
        Write-Host ""
        Write-Host "⏳ Waiting for job to complete..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # Test 6: Get job status
        Write-Host ""
        Write-Host "📊 Test 6: Checking job status" -ForegroundColor Yellow
        $statusResponse = Invoke-RestMethod -Uri "$API_BASE/clean/$jobId/status" -Method GET -UseBasicParsing
        
        if ($statusResponse.success) {
            Write-Host "✅ Job status retrieved" -ForegroundColor Green
            Write-Host "   Status: $($statusResponse.data.status)" -ForegroundColor Gray
            Write-Host "   Original rows: $($statusResponse.data.stats.original.totalRows)" -ForegroundColor Gray
            Write-Host "   Final rows: $($statusResponse.data.stats.final.totalRows)" -ForegroundColor Gray
        }
        
        # Test 7: Get report
        Write-Host ""
        Write-Host "📄 Test 7: Fetching cleaning report" -ForegroundColor Yellow
        try {
            $reportResponse = Invoke-RestMethod -Uri "$API_BASE/clean/$jobId/report" -Method GET -UseBasicParsing
            
            if ($reportResponse.success) {
                Write-Host "✅ Report fetched successfully!" -ForegroundColor Green
                Write-Host "   Job ID: $($reportResponse.data.job.id)" -ForegroundColor Gray
                Write-Host "   Logs count: $($reportResponse.data.logs.Count)" -ForegroundColor Gray
                Write-Host "   Has imputation stats: $($null -ne $reportResponse.data.job.stats.stages.imputation)" -ForegroundColor Gray
                Write-Host "   Has outlier stats: $($null -ne $reportResponse.data.job.stats.stages.outliers)" -ForegroundColor Gray
                
                Write-Host ""
                Write-Host "🌐 View report in browser:" -ForegroundColor Cyan
                Write-Host "   http://localhost:3000/cleaning/$jobId/report" -ForegroundColor White
            }
        } catch {
            Write-Host "❌ Report fetch failed: $($_.Exception.Message)" -ForegroundColor Red
            
            # Show more details
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                Write-Host "   Response: $responseBody" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Cleaning job failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ API Tests Complete" -ForegroundColor Green
