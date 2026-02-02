# サーバー起動手順書

確実にサーバーを起動するための手順です。**順番に実行**してください。

## 前提条件

- プロジェクトディレクトリ: `c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650`
- フロントエンドポート: 5185
- バックエンドポート: 3001

## 方法1: 個別に起動（推奨・確実）

### ステップ1: バックエンドサーバーの起動

**新しいPowerShellウィンドウ**を開いて、以下のコマンドを実行してください：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
npm run dev
```

**期待される結果**:
- `サーバーが起動しました: http://localhost:3001` というメッセージが表示される
- エラーが出ない

**エラーが出た場合**:
- エラーメッセージ全体をコピーして保存してください
- `Ctrl+C`で停止してください
- エラー内容を確認してください

### ステップ2: フロントエンドサーバーの起動

**別の新しいPowerShellウィンドウ**を開いて、以下のコマンドを実行してください：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
npm run dev
```

**期待される結果**:
- `Local: http://localhost:5185` というメッセージが表示される
- エラーが出ない

**エラーが出た場合**:
- エラーメッセージ全体をコピーして保存してください
- `Ctrl+C`で停止してください
- エラー内容を確認してください

### ステップ3: ブラウザでアクセス確認

1. **バックエンド**: http://localhost:3001 にアクセス
   - サーバー情報ページが表示されれば成功

2. **フロントエンド**: http://localhost:5185 にアクセス
   - ログイン画面が表示されれば成功

## 方法2: 再起動スクリプトを使用

既存プロセスを停止してから、両方のサーバーを起動します。

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
.\restart-servers.ps1
```

このスクリプトは以下を自動で実行します：
1. 既存のサーバープロセスを停止
2. 依存関係の確認
3. バックエンドサーバーを起動
4. フロントエンドサーバーを起動

## 方法3: 統合起動スクリプトを使用

起動前チェックを含む統合スクリプトを使用します。

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
.\start-dev.ps1
```

## トラブルシューティング

### エラー: "ポートが既に使用されています"

**解決方法**:
```powershell
# ポート5185を使用しているプロセスを停止
Get-NetTCPConnection -LocalPort 5185 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

# ポート3001を使用しているプロセスを停止
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

### エラー: "モジュールが見つからない"

**解決方法**:
```powershell
# フロントエンド
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
npm install

# バックエンド
cd server
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
npm install
npm run generate
```

### エラー: "Prisma Clientが生成されていない"

**解決方法**:
```powershell
cd server
npm run generate
```

## 確認事項

サーバーが正常に起動しているか確認：

1. **バックエンド**: http://localhost:3001 にアクセスできる
2. **フロントエンド**: http://localhost:5185 にアクセスできる
3. **ログイン画面**: フロントエンドでログイン画面が表示される

## 次のステップ

サーバーが正常に起動したら：
1. ブラウザで http://localhost:5185 にアクセス
2. ログイン画面が表示されることを確認
3. ユーザーが存在しない場合は、`cd server; npm run create-user` を実行
