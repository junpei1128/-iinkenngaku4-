# プロジェクトの状態確認スクリプト
# サーバー起動前に実行して、問題がないか確認します

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "プロジェクト状態確認" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# 1. Node.jsバージョン
Write-Host "[1] Node.jsバージョン" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
    
    if ($nodeVersion -match "v24") {
        Write-Host "  ⚠ 警告: Node.js v24は互換性問題が発生する可能性があります" -ForegroundColor Yellow
        Write-Host "  推奨: Node.js v20 LTS" -ForegroundColor Yellow
    } elseif ($nodeVersion -match "v20" -or $nodeVersion -match "v18") {
        Write-Host "  ✓ 推奨バージョンです" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Node.jsが見つかりません" -ForegroundColor Red
}
Write-Host ""

# 2. npmバージョン
Write-Host "[2] npmバージョン" -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npmが見つかりません" -ForegroundColor Red
}
Write-Host ""

# 3. フロントエンドの依存関係
Write-Host "[3] フロントエンドの依存関係" -ForegroundColor Yellow
$frontendNodeModules = Join-Path $projectRoot "node_modules"
if (Test-Path $frontendNodeModules) {
    $moduleCount = (Get-ChildItem $frontendNodeModules -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "  ✓ node_modulesが存在します ($moduleCount パッケージ)" -ForegroundColor Green
} else {
    Write-Host "  ✗ node_modulesが見つかりません" -ForegroundColor Red
    Write-Host "  実行: npm install" -ForegroundColor Yellow
}
Write-Host ""

# 4. バックエンドの依存関係
Write-Host "[4] バックエンドの依存関係" -ForegroundColor Yellow
$backendNodeModules = Join-Path $projectRoot "server\node_modules"
if (Test-Path $backendNodeModules) {
    $moduleCount = (Get-ChildItem $backendNodeModules -Directory -ErrorAction SilentlyContinue).Count
    Write-Host "  ✓ node_modulesが存在します ($moduleCount パッケージ)" -ForegroundColor Green
} else {
    Write-Host "  ✗ node_modulesが見つかりません" -ForegroundColor Red
    Write-Host "  実行: cd server; npm install" -ForegroundColor Yellow
}
Write-Host ""

# 5. 環境変数ファイル
Write-Host "[5] 環境変数ファイル" -ForegroundColor Yellow
$envPath = Join-Path $projectRoot "server\.env"
if (Test-Path $envPath) {
    Write-Host "  ✓ .envファイルが存在します" -ForegroundColor Green
    
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "JWT_SECRET=your_jwt_secret_key_here") {
        Write-Host "  ⚠ 警告: JWT_SECRETがデフォルト値のままです" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ JWT_SECRETが設定されています" -ForegroundColor Green
    }
} else {
    Write-Host "  ✗ .envファイルが見つかりません" -ForegroundColor Red
    Write-Host "  実行: cp server\env.example server\.env" -ForegroundColor Yellow
}
Write-Host ""

# 6. データベースファイル
Write-Host "[6] データベースファイル" -ForegroundColor Yellow
$dbPath = Join-Path $projectRoot "server\dev.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "  ✓ データベースファイルが存在します ($([math]::Round($dbSize/1KB, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ データベースファイルが見つかりません" -ForegroundColor Yellow
    Write-Host "  Prismaマイグレーションが必要かもしれません" -ForegroundColor Yellow
}
Write-Host ""

# 7. ポートの使用状況
Write-Host "[7] ポートの使用状況" -ForegroundColor Yellow
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
        return $connection
    } catch {
        return $false
    }
}

$frontendPort = 5185
$backendPort = 3001

$frontendInUse = Test-Port -Port $frontendPort
$backendInUse = Test-Port -Port $backendPort

if ($frontendInUse) {
    Write-Host "  ⚠ ポート $frontendPort (フロントエンド) は使用中です" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ ポート $frontendPort (フロントエンド) は使用可能です" -ForegroundColor Green
}

if ($backendInUse) {
    Write-Host "  ⚠ ポート $backendPort (バックエンド) は使用中です" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ ポート $backendPort (バックエンド) は使用可能です" -ForegroundColor Green
}
Write-Host ""

# 8. Prismaクライアント
Write-Host "[8] Prismaクライアント" -ForegroundColor Yellow
$prismaClient = Join-Path $projectRoot "server\node_modules\.prisma\client"
if (Test-Path $prismaClient) {
    Write-Host "  ✓ Prismaクライアントが生成されています" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Prismaクライアントが生成されていません" -ForegroundColor Yellow
    Write-Host "  実行: cd server; npm run generate" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "確認完了" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "問題がある場合は、QUICK_START.mdを参照してください。" -ForegroundColor Yellow
