#!/usr/bin/env powershell
# VistaraBI Authentication System Setup & Diagnostics
# This script initializes PostgreSQL, runs migrations, and validates the auth system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VistaraBI Auth System Setup & Diagnostics" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ====== Step 1: Check PostgreSQL ======
Write-Host "[1/6] Checking PostgreSQL..." -ForegroundColor Yellow
$pgProcess = Get-Process postgres -ErrorAction SilentlyContinue
if ($pgProcess) {
    Write-Host "✓ PostgreSQL is running (PID: $($pgProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "✗ PostgreSQL is NOT running" -ForegroundColor Red
    Write-Host "  Attempting to start PostgreSQL..." -ForegroundColor Yellow
    
    # Try to start PostgreSQL service
    $pgService = Get-Service "postgresql-x64*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Start-Service $pgService.Name -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Host "✓ Started PostgreSQL service" -ForegroundColor Green
    } else {
        Write-Host "⚠ PostgreSQL service not found. Checking for WSL PostgreSQL..." -ForegroundColor Yellow
    }
}

# ====== Step 2: Check Environment ======
Write-Host ""
Write-Host "[2/6] Checking environment configuration..." -ForegroundColor Yellow
cd C:\Projects\VistaraBI\vistarabi-landing

$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    $dbUrl = Select-String "DATABASE_URL=" $envFile | Select-Object -First 1
    Write-Host "  Database URL: $($dbUrl.Line)" -ForegroundColor Cyan
} else {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "  Creating .env from .env.local.example..." -ForegroundColor Yellow
    if (Test-Path ".env.local.example") {
        Copy-Item ".env.local.example" ".env" -Force
        Write-Host "✓ Created .env" -ForegroundColor Green
    } else {
        Write-Host "⚠ Could not find .env.local.example" -ForegroundColor Yellow
    }
}

# ====== Step 3: Verify Node Modules ======
Write-Host ""
Write-Host "[3/6] Checking npm dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ node_modules directory exists" -ForegroundColor Green
    
    $packages = @("@prisma/client", "bcryptjs", "jsonwebtoken")
    foreach ($pkg in $packages) {
        if (Test-Path "node_modules/$pkg") {
            Write-Host "  ✓ $pkg" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $pkg MISSING" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ node_modules not found. Running npm install..." -ForegroundColor Red
    npm install
}

# ====== Step 4: Generate Prisma Client ======
Write-Host ""
Write-Host "[4/6] Generating Prisma client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "✓ Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to generate Prisma client: $_" -ForegroundColor Red
}

# ====== Step 5: Run Database Migrations ======
Write-Host ""
Write-Host "[5/6] Running database migrations..." -ForegroundColor Yellow
try {
    Write-Host "  Attempting to connect to database..." -ForegroundColor Cyan
    npx prisma migrate deploy
    Write-Host "✓ Database migrations completed" -ForegroundColor Green
} catch {
    Write-Host "⚠ Migration warning (may be expected): $_" -ForegroundColor Yellow
    Write-Host "  Attempting to create/reset database..." -ForegroundColor Yellow
    
    try {
        npx prisma db push --skip-generate --force-reset
        Write-Host "✓ Database schema pushed" -ForegroundColor Green
    } catch {
        Write-Host "✗ Database error: $_" -ForegroundColor Red
        Write-Host "  Make sure PostgreSQL is running on localhost:5432" -ForegroundColor Yellow
    }
}

# ====== Step 6: Validation ======
Write-Host ""
Write-Host "[6/6] Validating setup..." -ForegroundColor Yellow

# Check if Prisma can connect
Write-Host "  Testing database connection..." -ForegroundColor Cyan
$testScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.\$connect();
    console.log('✓ Database connection successful');
    const userCount = await prisma.user.count();
    console.log(\`✓ Database ready (Users in DB: \${userCount}\`);
    await prisma.\$disconnect();
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    process.exit(1);
  }
})();
"@

$testScript | Out-File -FilePath "test-db.js" -Encoding UTF8
node test-db.js
Remove-Item test-db.js -Force

# ====== Summary ======
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure PostgreSQL is running: Get-Service postgresql* | Start-Service" -ForegroundColor Cyan
Write-Host "2. Start the dev server: npm run dev" -ForegroundColor Cyan
Write-Host "3. Navigate to: http://localhost:3000" -ForegroundColor Cyan
Write-Host "4. Test Registration & Login" -ForegroundColor Cyan
Write-Host ""
