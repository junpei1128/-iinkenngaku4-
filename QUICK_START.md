# クイックスタートガイド

サーバー起動を安定させるための手順です。**一つずつ順番に**実行してください。

## 前提条件の確認

### 1. Node.jsバージョンの確認

```powershell
node --version
```

**推奨**: Node.js v18 または v20  
**現在**: v24.12.0（互換性問題の可能性あり）

⚠️ Node.js v24を使用している場合、v20へのダウングレードを推奨します。

### 2. プロジェクトディレクトリに移動

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650
```

## ステップ1: フロントエンドの依存関係を再インストール

### 1-1. 既存のnode_modulesを削除

```powershell
# プロジェクトルートで実行
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
```

### 1-2. 依存関係をインストール

```powershell
npm install
```

**エラーが出た場合**:
- エラーメッセージをコピーして保存してください
- 次のステップに進まず、エラー内容を確認してください

### 1-3. フロントエンドの起動テスト

```powershell
npm run dev
```

**期待される結果**: 
- `Local: http://localhost:5185` というメッセージが表示される
- ブラウザで http://localhost:5185 にアクセスできる

**エラーが出た場合**:
- エラーメッセージ全体をコピーして保存してください
- `Ctrl+C`で停止してください

## ステップ2: バックエンドの依存関係を再インストール

### 2-1. 既存のnode_modulesを削除

```powershell
# serverディレクトリに移動
cd server

# 既存のnode_modulesを削除
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue
```

### 2-2. 依存関係をインストール

```powershell
npm install
```

### 2-3. Prismaクライアントを生成

```powershell
npm run generate
```

### 2-4. バックエンドの起動テスト

```powershell
npm run dev
```

**期待される結果**:
- `サーバーが起動しました: http://localhost:3001` というメッセージが表示される
- ブラウザで http://localhost:3001 にアクセスできる

**エラーが出た場合**:
- エラーメッセージ全体をコピーして保存してください
- `Ctrl+C`で停止してください

## ステップ3: 統合起動スクリプトの使用

両方のサーバーが個別に起動できることを確認したら、統合起動スクリプトを使用できます。

### 3-1. 統合起動スクリプトの実行

```powershell
# プロジェクトルートで実行
.\start-dev.ps1
```

このスクリプトは以下を自動でチェックします：
- Node.jsバージョン
- ポートの使用状況
- データベースファイルの存在
- 依存関係のインストール状況
- 環境変数の設定

## トラブルシューティング

### エラー: "モジュールが見つからない"

**原因**: 依存関係が正しくインストールされていない

**解決方法**:
1. `node_modules`と`package-lock.json`を削除
2. `npm install`を再実行

### エラー: "ポートが既に使用されています"

**原因**: 既にサーバーが起動している、または他のアプリケーションがポートを使用している

**解決方法**:
1. 既存のサーバープロセスを停止（`Ctrl+C`）
2. または、別のポート番号を使用するように設定を変更

### エラー: "Node.js v24は互換性問題が..."

**原因**: Node.js v24は一部のパッケージと互換性がない可能性がある

**解決方法**:
1. Node.js v20 LTSをダウンロード: https://nodejs.org/
2. インストール後、再度`npm install`を実行

### エラー: "Prisma Clientが生成されていない"

**原因**: Prismaクライアントが生成されていない

**解決方法**:
```powershell
cd server
npm run generate
```

## 次のステップ

サーバーが正常に起動したら：
1. ブラウザで http://localhost:5185 にアクセス
2. ログイン画面が表示されることを確認
3. レポート機能をテスト

## サポート

問題が解決しない場合、以下の情報を準備してください：
1. エラーメッセージ全文
2. `node --version`の結果
3. `npm --version`の結果
4. 実行したコマンドの履歴
