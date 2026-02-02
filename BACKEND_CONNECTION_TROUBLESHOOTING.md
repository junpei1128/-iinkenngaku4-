# バックエンド接続エラー トラブルシューティングガイド

「サーバーに接続できません。バックエンドサーバー (http://localhost:3001) が起動しているか確認してください。」というエラーが表示された場合の対処方法です。

## 原因の特定

### ステップ1: バックエンドサーバーの状態確認

**PowerShellウィンドウでバックエンドサーバーを起動したウィンドウを確認してください。**

以下のメッセージが表示されているか確認：
- `サーバーが起動しました: http://localhost:3001`
- エラーメッセージが出ていないか

### ステップ2: ブラウザで直接アクセステスト

ブラウザで以下のURLに直接アクセスしてください：
- http://localhost:3001

**期待される結果**:
- サーバー情報ページが表示される
- エラーページが表示されない

**エラーページが表示される場合**:
- バックエンドサーバーが起動していない、またはエラーが発生している

### ステップ3: 接続確認スクリプトの実行

プロジェクトフォルダで以下のコマンドを実行：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
.\check-backend-connection.ps1
```

このスクリプトは以下を確認します：
1. ポート3001が使用されているか
2. HTTP接続が可能か
3. APIエンドポイントがアクセス可能か

## 解決方法

### 方法1: バックエンドサーバーを個別に起動（推奨）

**新しいPowerShellウィンドウ**を開いて：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
npm run dev
```

**期待される結果**:
- `サーバーが起動しました: http://localhost:3001` というメッセージが表示される
- エラーが出ない

### 方法2: 既存プロセスを停止して再起動

```powershell
# ポート3001を使用しているプロセスを停止
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

# バックエンドサーバーを再起動
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
npm run dev
```

### 方法3: 再起動スクリプトを使用

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
.\restart-servers.ps1
```

## ブラウザの開発者ツールで確認

1. ブラウザで `F12` キーを押して開発者ツールを開く
2. **Console**タブを確認
   - バックエンド接続に関する警告やエラーが表示される
3. **Network**タブを確認
   - レポート保存を試みる
   - `/api/reports` へのリクエストを確認
   - リクエストのステータスコードを確認（200が成功）

## よくある問題

### 問題1: バックエンドサーバーが起動していない

**症状**: ブラウザで http://localhost:3001 にアクセスできない

**解決方法**:
1. バックエンドサーバーを起動するPowerShellウィンドウを確認
2. エラーが出ていないか確認
3. エラーが出ている場合は、エラーメッセージを確認して対処

### 問題2: ポートが既に使用されている

**症状**: バックエンドサーバー起動時に「ポートが既に使用されています」というエラー

**解決方法**:
```powershell
# ポート3001を使用しているプロセスを停止
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

### 問題3: CORSエラー

**症状**: ブラウザの開発者ツールのConsoleにCORSエラーが表示される

**解決方法**:
- [server/src/server.ts](server/src/server.ts) のCORS設定を確認
- `FRONTEND_URL` 環境変数が正しく設定されているか確認

### 問題4: データベース接続エラー

**症状**: バックエンドサーバーのログにデータベース関連のエラーが表示される

**解決方法**:
```powershell
cd server
npm run generate
```

## 確認事項チェックリスト

- [ ] バックエンドサーバーが起動している（PowerShellウィンドウで確認）
- [ ] ブラウザで http://localhost:3001 にアクセスできる
- [ ] ポート3001が使用されている（`check-backend-connection.ps1`で確認）
- [ ] ブラウザの開発者ツール（F12）でエラーが出ていない
- [ ] NetworkタブでAPIリクエストが送信されている

## 次のステップ

バックエンドサーバーが正常に起動したら：
1. ブラウザで http://localhost:5185 にアクセス
2. レポート保存を再度試みる
3. エラーが解決したことを確認
