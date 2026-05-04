# VistaraBI System Health Check
# Run this to verify all systems are operational

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "VISTARABI SYSTEM HEALTH CHECK" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: PostgreSQL
Write-Host "[1/6] PostgreSQL Status..." -NoNewline
$pgProcess = Get-Process postgres -ErrorAction SilentlyContinue
if ($pgProcess) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT RUNNING" -ForegroundColor Red
    Write-Host "      Run: 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D 'C:\Program Files\PostgreSQL\18\data' start" -ForegroundColor Yellow
    $allGood = $false
}

# Check 2: Node.js
Write-Host "[2/6] Node.js Installation..." -NoNewline
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

# Check 3: npm dependencies
Write-Host "[3/6] npm Dependencies..." -NoNewline
$nmPath = "C:\Projects\VistaraBI\vistarabi-landing\node_modules"
if (Test-Path $nmPath) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT INSTALLED" -ForegroundColor Red
    Write-Host "      Run: cd vistarabi-landing && npm install" -ForegroundColor Yellow
    $allGood = $false
}

# Check 4: .env file
Write-Host "[4/6] Environment Configuration..." -NoNewline
if (Test-Path "C:\Projects\VistaraBI\vistarabi-landing\.env") {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ MISSING" -ForegroundColor Red
    $allGood = $false
}

# Check 5: Prisma Client
Write-Host "[5/6] Prisma Client..." -NoNewline
$prismaPath = "C:\Projects\VistaraBI\vistarabi-landing\node_modules\.prisma\client"
if (Test-Path $prismaPath) {
    Write-Host " ✓" -ForegroundColor Green
} else {
    Write-Host " ✗ NOT GENERATED" -ForegroundColor Red
    Write-Host "      Run: npx prisma generate" -ForegroundColor Yellow
    $allGood = $false
}

# Check 6: Dev Server
Write-Host "[6/6] Dev Server Status..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host " ✓" -ForegroundColor Green
} catch {
    Write-Host " ⚠ NOT RUNNING" -ForegroundColor Yellow
    Write-Host "      Run: cd vistarabi-landing && npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✓ ALL SYSTEMS OPERATIONAL" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access the app: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "⚠ SOME SYSTEMS NEED ATTENTION" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow the instructions above to fix issues" -ForegroundColor Cyan
}
Write-Host "=====================================" -ForegroundColor Cyan
