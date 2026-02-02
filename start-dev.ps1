# 医院見学レポート管理システム - 開発環境起動スクリプト
# フロントエンドとバックエンドを同時に起動します

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "医院見学レポート管理システム" -ForegroundColor Cyan
Write-Host "開発環境起動スクリプト" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# プロジェクトルートに移動
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Node.jsバージョンチェック
Write-Host "[1/5] Node.jsバージョンを確認中..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  現在のNode.jsバージョン: $nodeVersion" -ForegroundColor Gray

# Node.js v24の警告
if ($nodeVersion -match "v24") {
    Write-Host "  ⚠ 警告: Node.js v24は互換性問題が発生する可能性があります" -ForegroundColor Yellow
    Write-Host "  推奨: Node.js v20 LTSの使用を推奨します" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  続行しますか？ (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "  起動をキャンセルしました" -ForegroundColor Red
        exit 1
    }
}

# ポートチェック
Write-Host ""
Write-Host "[2/5] ポートの使用状況を確認中..." -ForegroundColor Yellow

function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

$frontendPort = 5185
$backendPort = 3001

$frontendInUse = Test-Port -Port $frontendPort
$backendInUse = Test-Port -Port $backendPort

if ($frontendInUse) {
    Write-Host "  ⚠ 警告: ポート $frontendPort (フロントエンド) は既に使用されています" -ForegroundColor Yellow
}

if ($backendInUse) {
    Write-Host "  ⚠ 警告: ポート $backendPort (バックエンド) は既に使用されています" -ForegroundColor Yellow
}

if (-not $frontendInUse -and -not $backendInUse) {
    Write-Host "  ✓ ポートは使用可能です" -ForegroundColor Green
}

# データベースファイルの確認
Write-Host ""
Write-Host "[3/5] データベースファイルを確認中..." -ForegroundColor Yellow
$dbPath = Join-Path $projectRoot "server\dev.db"
if (Test-Path $dbPath) {
    Write-Host "  ✓ データベースファイルが見つかりました: $dbPath" -ForegroundColor Green
} else {
    Write-Host "  ⚠ 警告: データベースファイルが見つかりません: $dbPath" -ForegroundColor Yellow
    Write-Host "  Prismaマイグレーションが必要かもしれません" -ForegroundColor Yellow
}

# 依存関係の確認
Write-Host ""
Write-Host "[4/5] 依存関係を確認中..." -ForegroundColor Yellow

$frontendNodeModules = Join-Path $projectRoot "node_modules"
$backendNodeModules = Join-Path $projectRoot "server\node_modules"

if (-not (Test-Path $frontendNodeModules)) {
    Write-Host "  ⚠ 警告: フロントエンドのnode_modulesが見つかりません" -ForegroundColor Yellow
    Write-Host "  npm installを実行してください" -ForegroundColor Yellow
}

if (-not (Test-Path $backendNodeModules)) {
    Write-Host "  ⚠ 警告: バックエンドのnode_modulesが見つかりません" -ForegroundColor Yellow
    Write-Host "  serverディレクトリでnpm installを実行してください" -ForegroundColor Yellow
}

if ((Test-Path $frontendNodeModules) -and (Test-Path $backendNodeModules)) {
    Write-Host "  ✓ 依存関係はインストール済みです" -ForegroundColor Green
}

# 環境変数の確認
Write-Host ""
Write-Host "[5/5] 環境変数を確認中..." -ForegroundColor Yellow
$envPath = Join-Path $projectRoot "server\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "JWT_SECRET=your_jwt_secret_key_here") {
        Write-Host "  ⚠ 警告: JWT_SECRETがデフォルト値のままです" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ 環境変数ファイルは設定済みです" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ 警告: .envファイルが見つかりません" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "サーバーを起動します..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "フロントエンド: http://localhost:$frontendPort" -ForegroundColor Green
Write-Host "バックエンド: http://localhost:$backendPort" -ForegroundColor Green
Write-Host ""
Write-Host "停止するには Ctrl+C を押してください" -ForegroundColor Yellow
Write-Host ""

# バックエンドサーバーを起動（バックグラウンド）
Write-Host "[バックエンド] 起動中..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot
    Set-Location server
    npm run dev
}

# 少し待ってからフロントエンドを起動
Start-Sleep -Seconds 3

# フロントエンドサーバーを起動（フォアグラウンド）
Write-Host "[フロントエンド] 起動中..." -ForegroundColor Cyan
try {
    npm run dev
} finally {
    # クリーンアップ: バックエンドジョブを停止
    Write-Host ""
    Write-Host "サーバーを停止しています..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Write-Host "停止しました" -ForegroundColor Green
}
