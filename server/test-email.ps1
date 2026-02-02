# メール送信テストスクリプト
# 使用方法: .\test-email.ps1 -Email "your-email@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

$body = @{
    testEmail = $Email
} | ConvertTo-Json

try {
    Write-Host "メール送信テストを開始します..." -ForegroundColor Cyan
    Write-Host "送信先: $Email" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/test-email" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✓ テストメール送信成功！" -ForegroundColor Green
        Write-Host "メッセージID: $($response.messageId)" -ForegroundColor Green
        Write-Host "送信先: $($response.to)" -ForegroundColor Green
        Write-Host ""
        Write-Host "メールボックスを確認してください。" -ForegroundColor Cyan
    } else {
        Write-Host "✗ テストメール送信失敗" -ForegroundColor Red
        Write-Host "エラー: $($response.error)" -ForegroundColor Red
        if ($response.details) {
            Write-Host "詳細: $($response.details)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "✗ エラーが発生しました" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "レスポンス: $responseBody" -ForegroundColor Red
    }
}
