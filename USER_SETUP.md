# ユーザーセットアップガイド

ログイン認証エラーを解決するための手順です。

## 問題

「認証が必要です。ログインしてください。」というエラーが表示される場合、データベースにユーザーが存在しない可能性があります。

## 解決方法

### ステップ1: バックエンドサーバーが起動していることを確認

バックエンドサーバーが起動している必要があります。別のPowerShellウィンドウで以下を実行してください：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
npm run dev
```

**確認**: `サーバーが起動しました: http://localhost:3001` というメッセージが表示されていることを確認してください。

### ステップ2: ユーザー作成スクリプトの実行

**新しいPowerShellウィンドウ**を開いて、以下のコマンドを実行してください：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
npm run create-user
```

### ステップ3: 実行結果の確認

スクリプトの実行結果を確認してください：

**成功した場合**:
```
✓ 初回ユーザーを作成しました:
  メールアドレス: yamashita-j@consuldent.jp
  名前: デフォルトユーザー
  ロール: admin
  ID: [UUID]

ログイン情報:
  メールアドレス: yamashita-j@consuldent.jp
  パスワード: jyunpei1128
```

**既にユーザーが存在する場合**:
```
ユーザーは既に存在します: yamashita-j@consuldent.jp
既存のユーザー情報:
  ID: [UUID]
  名前: [名前]
  ロール: [ロール]
```

### ステップ4: ログインの再試行

1. ブラウザで http://localhost:5185/ にアクセス
2. 以下の情報でログインを試みる：
   - **メールアドレス**: `yamashita-j@consuldent.jp`
   - **パスワード**: `jyunpei1128`

## カスタムユーザーの作成

デフォルト以外のユーザーを作成する場合：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4_backup_20260126_152650\server
$env:INITIAL_EMAIL="your-email@example.com"
$env:INITIAL_PASSWORD="your-password"
$env:INITIAL_NAME="Your Name"
npm run create-user
```

## トラブルシューティング

### エラー: "Prisma Client is not generated"

Prismaクライアントを生成してください：

```powershell
cd server
npm run generate
npm run create-user
```

### エラー: "Cannot connect to database"

データベースファイルが存在するか確認してください：

```powershell
Test-Path server\dev.db
```

存在しない場合は、Prismaマイグレーションを実行してください：

```powershell
cd server
npm run migrate:dev
```

### ログイン後もエラーが表示される場合

1. ブラウザの開発者ツール（F12）を開く
2. Consoleタブでエラーメッセージを確認
3. NetworkタブでAPIリクエストの詳細を確認
4. バックエンドサーバーのコンソール出力を確認

## 次のステップ

ログインが成功したら：
1. 通知先登録ページ（/recipients）にリダイレクトされます
2. レポート機能を使用できます
