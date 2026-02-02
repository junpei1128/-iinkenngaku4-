# Server Restart Script
# Stop existing server processes and start servers in clean state

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server Restart Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Stop existing processes
Write-Host "[1/4] Stopping existing server processes..." -ForegroundColor Yellow

$port5185Processes = Get-NetTCPConnection -LocalPort 5185 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port5185Processes) {
    Write-Host "  Stopping processes using port 5185..." -ForegroundColor Gray
    $port5185Processes | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "    Process $_ stopped" -ForegroundColor Gray
    }
} else {
    Write-Host "  Port 5185 is not in use" -ForegroundColor Green
}

$port3001Processes = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port3001Processes) {
    Write-Host "  Stopping processes using port 3001..." -ForegroundColor Gray
    $port3001Processes | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "    Process $_ stopped" -ForegroundColor Gray
    }
} else {
    Write-Host "  Port 3001 is not in use" -ForegroundColor Green
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[2/4] Checking project status..." -ForegroundColor Yellow

$frontendNodeModules = Join-Path $projectRoot "node_modules"
$backendNodeModules = Join-Path $projectRoot "server\node_modules"

if (-not (Test-Path $frontendNodeModules)) {
    Write-Host "  Warning: Frontend node_modules not found" -ForegroundColor Yellow
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "  Frontend dependencies exist" -ForegroundColor Green
}

if (-not (Test-Path $backendNodeModules)) {
    Write-Host "  Warning: Backend node_modules not found" -ForegroundColor Yellow
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    Set-Location server
    npm install
    npm run generate
    Set-Location $projectRoot
} else {
    Write-Host "  Backend dependencies exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/4] Starting backend server..." -ForegroundColor Yellow

$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot
    Set-Location server
    npm run dev
}

Start-Sleep -Seconds 5

$backendRunning = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue -InformationLevel Quiet
if ($backendRunning) {
    Write-Host "  Backend server started: http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "  Warning: Could not confirm backend server startup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[4/4] Starting frontend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Servers Starting" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:5185" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

try {
    npm run dev
} finally {
    Write-Host ""
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Write-Host "Stopped" -ForegroundColor Green
}
