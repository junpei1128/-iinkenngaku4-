# Backend Connection Check Script
# Check if backend server is running and accessible

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Connection Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:3001"

# Check if port 3001 is in use
Write-Host "[1/3] Checking port 3001..." -ForegroundColor Yellow
$port3001Connection = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001Connection) {
    $processId = $port3001Connection.OwningProcess | Select-Object -First 1 -Unique
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    Write-Host "  Port 3001 is in use" -ForegroundColor Green
    Write-Host "  Process ID: $processId" -ForegroundColor Gray
    if ($process) {
        Write-Host "  Process Name: $($process.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Port 3001 is NOT in use" -ForegroundColor Red
    Write-Host "  Backend server is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the backend server, run:" -ForegroundColor Yellow
    Write-Host "  cd server" -ForegroundColor Gray
    Write-Host "  npm run dev" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "[2/3] Testing HTTP connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  Backend server is responding" -ForegroundColor Green
        Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Gray
    } else {
        Write-Host "  Backend server returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Failed to connect to backend server" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  1. Backend server is not running" -ForegroundColor Gray
    Write-Host "  2. Backend server is starting up (wait a few seconds)" -ForegroundColor Gray
    Write-Host "  3. Firewall is blocking the connection" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "[3/3] Testing API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  API endpoint is accessible" -ForegroundColor Green
        Write-Host "  Backend URL: $backendUrl" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Failed to access API endpoint" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend server status:" -ForegroundColor Green
Write-Host "  URL: $backendUrl" -ForegroundColor Gray
Write-Host "  Health: http://localhost:3001/health" -ForegroundColor Gray
Write-Host "  Main: http://localhost:3001/" -ForegroundColor Gray
Write-Host ""
