# Backup Script
# Create a timestamped backup of the current project

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# タイムスタンプを生成（YYYYMMDD_HHMMSS形式）
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupName = "iinkenngaku4_backup_$timestamp"
$backupPath = Join-Path (Split-Path -Parent $projectRoot) $backupName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Backup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Backup Path: $backupPath" -ForegroundColor Gray
Write-Host ""

# バックアップ先が既に存在する場合は確認
if (Test-Path $backupPath) {
    $response = Read-Host "Backup directory already exists. Overwrite? (y/N)"
    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Host "Backup cancelled." -ForegroundColor Yellow
        exit
    }
    Remove-Item -Path $backupPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "[1/3] Creating backup directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

Write-Host "[2/3] Copying project files..." -ForegroundColor Yellow

# コピーする項目を定義
$itemsToCopy = @(
    'src',
    'server',
    'public',
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.node.json',
    'index.html',
    '.env.example',
    'README.md',
    'QUICK_START.md',
    'START_SERVERS.md',
    'USER_SETUP.md',
    'BACKEND_CONNECTION_TROUBLESHOOTING.md',
    '*.ps1',
    '*.md'
)

# 各項目をコピー
foreach ($item in $itemsToCopy) {
    $sourcePath = Join-Path $projectRoot $item
    if (Test-Path $sourcePath) {
        Write-Host "  Copying: $item" -ForegroundColor Gray
        Copy-Item -Path $sourcePath -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# node_modulesは除外（再インストール可能なため）
Write-Host "  Skipping: node_modules (will be regenerated)" -ForegroundColor Gray
Write-Host "  Skipping: .env (contains sensitive data)" -ForegroundColor Gray

Write-Host ""
Write-Host "[3/3] Creating backup info file..." -ForegroundColor Yellow

# バックアップ情報を記録
$backupInfo = @"
Backup Information
==================
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Source: $projectRoot
Backup: $backupPath

Project Status:
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript + Prisma
- Database: SQLite

To restore:
1. Copy the backup directory to your desired location
2. Run: npm install (in root directory)
3. Run: cd server && npm install && npm run generate
4. Copy .env file if needed
"@

$backupInfo | Out-File -FilePath (Join-Path $backupPath "BACKUP_INFO.txt") -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backup Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup Location: $backupPath" -ForegroundColor Green
Write-Host ""
Write-Host "Note: node_modules and .env files are not included." -ForegroundColor Yellow
Write-Host "      You will need to run 'npm install' after restoring." -ForegroundColor Yellow
Write-Host ""
