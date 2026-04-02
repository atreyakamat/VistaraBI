# VistaraBI — Modelfile Registration Script (Windows PowerShell)
# Registers all 8 domain-specific Ollama models + 3 shared models.
# Run this once after cloning the repo or whenever Modelfiles change.
#
# Usage:
#   cd vistarabi-landing
#   .\scripts\register-modelfiles.ps1
#
# Prerequisites:
#   - Ollama is installed and accessible via `ollama` command
#   - ollama serve is running (or start it before running this script)
#   - qwen3:0.6b base model has been pulled: ollama pull qwen3:0.6b

param(
    [switch]$DryRun,   # Print commands without executing
    [switch]$Force,    # Re-register even if model already exists
    [string]$BaseModel = "qwen3:0.6b"
)

$ErrorActionPreference = "Stop"

# ─── Configuration ────────────────────────────────────────────────────────────

$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot    = Split-Path -Parent $ScriptDir
$ModelfilesDir = Join-Path $RepoRoot "modelfiles"

# Domain analytics models: (FileName → OllamaModelName)
$DomainModels = [ordered]@{
    "Modelfile.analytics.ecommerce"     = "vistara-analytics-ecommerce"
    "Modelfile.analytics.saas"          = "vistara-analytics-saas"
    "Modelfile.analytics.edtech"        = "vistara-analytics-edtech"
    "Modelfile.analytics.retail"        = "vistara-analytics-retail"
    "Modelfile.analytics.services"      = "vistara-analytics-services"
    "Modelfile.analytics.manufacturing" = "vistara-analytics-manufacturing"
    "Modelfile.analytics.healthcare"    = "vistara-analytics-healthcare"
    "Modelfile.analytics.finance"       = "vistara-analytics-finance"
}

# Shared / cross-domain models
$SharedModels = [ordered]@{
    "Modelfile.analytics"  = "vistara-analytics"
    "Modelfile.strategy"   = "vistara-strategy"
    "Modelfile.report"     = "vistara-report"
}

# ─── Helpers ──────────────────────────────────────────────────────────────────

function Write-Header($text) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Register-Model($modelfilePath, $modelName) {
    if (-not (Test-Path $modelfilePath)) {
        Write-Host "  ⚠  MISSING: $modelfilePath" -ForegroundColor Yellow
        return $false
    }

    # Check if already registered
    if (-not $Force) {
        $existingModels = (ollama list 2>$null) -join " "
        if ($existingModels -match [regex]::Escape($modelName)) {
            Write-Host "  ✓  ALREADY EXISTS: $modelName (use -Force to re-register)" -ForegroundColor DarkGray
            return $true
        }
    }

    $cmd = "ollama create $modelName -f `"$modelfilePath`""
    Write-Host "  ▶  $modelName" -ForegroundColor Cyan
    Write-Host "     File: $modelfilePath" -ForegroundColor DarkGray

    if ($DryRun) {
        Write-Host "     [DRY RUN] Would run: $cmd" -ForegroundColor Magenta
        return $true
    }

    try {
        Invoke-Expression $cmd
        Write-Host "     ✅ Registered: $modelName" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "     ❌ FAILED: $_" -ForegroundColor Red
        return $false
    }
}

# ─── Preflight ────────────────────────────────────────────────────────────────

Write-Header "VistaraBI Modelfile Registration"

# Verify ollama is available
try {
    $null = ollama --version
    Write-Host "  ✅ Ollama found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Ollama not found in PATH. Install from https://ollama.com" -ForegroundColor Red
    exit 1
}

# Verify base model is available
Write-Host "  Checking base model: $BaseModel ..." -ForegroundColor DarkGray
$baseExists = (ollama list 2>$null) -join " "
if (-not ($baseExists -match [regex]::Escape($BaseModel.Split(":")[0]))) {
    Write-Host "  ⚠  Base model '$BaseModel' not found. Pulling now..." -ForegroundColor Yellow
    if (-not $DryRun) {
        ollama pull $BaseModel
    }
}

$success = 0
$failed  = 0

# ─── Register Shared Models ───────────────────────────────────────────────────

Write-Header "Shared / Cross-Domain Models (3)"

foreach ($entry in $SharedModels.GetEnumerator()) {
    $modelfilePath = Join-Path $ModelfilesDir $entry.Key
    $result = Register-Model -modelfilePath $modelfilePath -modelName $entry.Value
    if ($result) { $success++ } else { $failed++ }
}

# ─── Register Domain Analytics Models ─────────────────────────────────────────

Write-Header "Domain Analytics Models (8)"

foreach ($entry in $DomainModels.GetEnumerator()) {
    $modelfilePath = Join-Path $ModelfilesDir $entry.Key
    $result = Register-Model -modelfilePath $modelfilePath -modelName $entry.Value
    if ($result) { $success++ } else { $failed++ }
}

# ─── Summary ──────────────────────────────────────────────────────────────────

Write-Header "Registration Summary"
Write-Host "  ✅ Registered: $success  |  ❌ Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "  Domain model map:" -ForegroundColor Cyan
Write-Host "    ECOMMERCE     → vistara-analytics-ecommerce"     -ForegroundColor DarkGray
Write-Host "    SAAS          → vistara-analytics-saas"          -ForegroundColor DarkGray
Write-Host "    EDTECH        → vistara-analytics-edtech"        -ForegroundColor DarkGray
Write-Host "    RETAIL        → vistara-analytics-retail"        -ForegroundColor DarkGray
Write-Host "    SERVICES      → vistara-analytics-services"      -ForegroundColor DarkGray
Write-Host "    MANUFACTURING → vistara-analytics-manufacturing" -ForegroundColor DarkGray
Write-Host "    HEALTHCARE    → vistara-analytics-healthcare"    -ForegroundColor DarkGray
Write-Host "    FINANCE       → vistara-analytics-finance"       -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Smoke test:" -ForegroundColor Cyan
Write-Host '    ollama run vistara-analytics-manufacturing "What is OEE?"' -ForegroundColor DarkGray
Write-Host '    ollama run vistara-analytics-healthcare "What is bed occupancy?"' -ForegroundColor DarkGray
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
