# Vistara BI - Data Upload Module Startup Script
# Run this script to start all services

Write-Host "🚀 Starting Vistara BI - Data Upload Module" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "📊 Checking PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq 'Running') {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL is not running. Please start PostgreSQL service." -ForegroundColor Red
    Write-Host "   Run: Start-Service postgresql-x64-15" -ForegroundColor Gray
    exit 1
}

# Check if Redis is running
Write-Host "🔴 Checking Redis..." -ForegroundColor Yellow
$redisCheck = redis-cli ping 2>$null
if ($redisCheck -eq "PONG") {
    Write-Host "✅ Redis is running" -ForegroundColor Green
} else {
    Write-Host "❌ Redis is not running. Please start Redis." -ForegroundColor Red
    Write-Host "   Run: redis-server" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "✨ All prerequisites are running!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open 3 terminal windows" -ForegroundColor White
Write-Host "2. Terminal 1: cd backend && npm run dev" -ForegroundColor White
Write-Host "3. Terminal 2: cd backend && npm run worker" -ForegroundColor White
Write-Host "4. Terminal 3: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access the app at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
