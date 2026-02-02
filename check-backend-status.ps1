# Backend Server Status Check Script
# Check if the backend server is running on port 3001

$port = 3001
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Server Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "Backend server is running on port $port" -ForegroundColor Green
    $processes | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Process ID: $($_.OwningProcess), Name: $($proc.Name)" -ForegroundColor Gray
        }
    }
    Write-Host ""
    Write-Host "Testing HTTP connection..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "HTTP connection successful!" -ForegroundColor Green
            Write-Host "Backend URL: http://localhost:$port" -ForegroundColor Green
        } else {
            Write-Host "HTTP connection failed with status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "HTTP connection failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "The server may be starting up or there may be an error." -ForegroundColor Yellow
    }
} else {
    Write-Host "Backend server is NOT running on port $port" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the backend server:" -ForegroundColor Yellow
    Write-Host "  cd server" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
