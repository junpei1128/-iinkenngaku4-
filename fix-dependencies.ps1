# Fix Dependencies Script
# Reinstall dependencies to fix missing packages

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix Dependencies Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Fix Frontend Dependencies
Write-Host "[1/2] Fixing frontend dependencies..." -ForegroundColor Yellow

Write-Host "  Removing existing node_modules..." -ForegroundColor Gray
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue

Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Frontend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  Error: Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] Fixing backend dependencies..." -ForegroundColor Yellow

Set-Location server

Write-Host "  Removing existing node_modules..." -ForegroundColor Gray
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue

Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Backend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  Error: Failed to install backend dependencies" -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}

Write-Host "  Generating Prisma client..." -ForegroundColor Gray
npm run generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Prisma client generated successfully" -ForegroundColor Green
} else {
    Write-Host "  Warning: Failed to generate Prisma client" -ForegroundColor Yellow
}

Set-Location $projectRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dependencies fixed successfully" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the servers using:" -ForegroundColor Green
Write-Host "  .\restart-servers.ps1" -ForegroundColor Yellow
Write-Host ""
