#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Run Peerit Keycloak API tests using Newman
.DESCRIPTION
    Executes the Postman collection to validate Keycloak infrastructure for the Peerit platform
.PARAMETER ReportFormat
    Output format for test results (cli, json, html)
.PARAMETER Verbose
    Enable verbose output for debugging
.EXAMPLE
    .\run-tests.ps1 -ReportFormat html
#>

param(
    [ValidateSet('cli', 'json', 'html')]
    [string]$ReportFormat = 'cli',
    [switch]$Verbose
)

# Configuration
$testCollection = "peerit-keycloak-tests.json"
$testDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$outputDir = Join-Path $testDir "results"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Ensure output directory exists
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Check if Newman is installed
try {
    $newmanVersion = npx newman --version 2>$null
    Write-Host "✓ Newman found: $newmanVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Newman not found. Installing..." -ForegroundColor Yellow
    npm install -g newman
    npm install -g newman-reporter-html
}

# Check if Keycloak is running
Write-Host "Checking Keycloak availability..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Keycloak is running and healthy" -ForegroundColor Green
    } else {
        throw "Keycloak health check failed"
    }
} catch {
    Write-Host "✗ Keycloak is not accessible. Please start it with:" -ForegroundColor Red
    Write-Host "  docker compose -f compose.keycloak.yml up -d" -ForegroundColor Yellow
    exit 1
}

# Build Newman command
$newmanArgs = @(
    "run", $testCollection
    "--timeout-request", "30000"
    "--delay-request", "500"
)

# Add reporting based on format
switch ($ReportFormat) {
    'json' {
        $reportFile = Join-Path $outputDir "test-results-$timestamp.json"
        $newmanArgs += @("--reporters", "cli,json", "--reporter-json-export", $reportFile)
    }
    'html' {
        $reportFile = Join-Path $outputDir "test-results-$timestamp.html"
        $newmanArgs += @("--reporters", "cli,html", "--reporter-html-export", $reportFile)
    }
    default {
        $newmanArgs += @("--reporters", "cli")
    }
}

# Add verbose output if requested
if ($Verbose) {
    $newmanArgs += @("--verbose")
}

# Run tests
Write-Host "🚀 Running Peerit Keycloak API tests..." -ForegroundColor Cyan
Write-Host "Collection: $testCollection" -ForegroundColor Gray

try {
    Set-Location $testDir
    $process = Start-Process -FilePath "npx" -ArgumentList ("newman", $newmanArgs) -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ All tests passed!" -ForegroundColor Green
        
        if ($ReportFormat -ne 'cli' -and $reportFile) {
            Write-Host "📊 Report saved: $reportFile" -ForegroundColor Cyan
            
            # Open HTML report if requested
            if ($ReportFormat -eq 'html' -and (Test-Path $reportFile)) {
                $openReport = Read-Host "Open HTML report in browser? (y/n)"
                if ($openReport -eq 'y' -or $openReport -eq 'Y') {
                    Start-Process $reportFile
                }
            }
        }
    } else {
        Write-Host "❌ Some tests failed (exit code: $($process.ExitCode))" -ForegroundColor Red
        exit $process.ExitCode
    }
} catch {
    Write-Host "❌ Error running tests: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host "`n🏁 Test execution completed" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray

if ($ReportFormat -ne 'cli') {
    Write-Host "Results: $reportFile" -ForegroundColor Gray
}
