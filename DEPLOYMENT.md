# デプロイメントガイド

## 概要

このシステムは以下の構成でデプロイできます：

- **フロントエンド**: Vercel（推奨）またはその他の静的ホスティング
- **バックエンド**: Railway または Render（PostgreSQL付き）

## 前提条件

1. GitHubアカウント
2. Vercelアカウント（無料）
3. Railway または Renderアカウント（無料枠あり）

## デプロイ手順

### 1. リポジトリをGitHubにプッシュ

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. バックエンドのデプロイ（Railway推奨）

#### Railwayを使用する場合

1. [Railway](https://railway.app/)にアクセスしてログイン
2. "New Project" → "Deploy from GitHub repo"を選択
3. リポジトリを選択
4. "Add Service" → "Database" → "PostgreSQL"を追加
5. サーバーサービスを追加し、`server`ディレクトリをルートとして設定
6. 環境変数を設定：
   - `DATABASE_URL`: PostgreSQLの接続URL（Railwayが自動生成）
   - `PORT`: `3001`（またはRailwayが自動設定）
   - `FRONTEND_URL`: フロントエンドのURL（後で設定）
   - `GMAIL_USER`: Gmailアドレス
   - `GMAIL_APP_PASSWORD`: Gmailアプリパスワード
   - `JWT_SECRET`: ランダムな文字列（`openssl rand -base64 32`で生成）

7. Prismaマイグレーションを実行：
   - Railwayのコンソールで "Deploy" → "Run Command" を選択
   - コマンド: `cd server && npx prisma migrate deploy`

#### Renderを使用する場合

1. [Render](https://render.com/)にアクセスしてログイン
2. "New" → "Web Service"を選択
3. GitHubリポジトリを接続
4. 設定：
   - **Name**: `iinkenngaku4-server`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. "New" → "PostgreSQL"でデータベースを作成
6. 環境変数を設定（Railwayと同様）
7. Prismaマイグレーションを実行

### 3. フロントエンドのデプロイ（Vercel）

1. [Vercel](https://vercel.com/)にアクセスしてログイン
2. "Add New" → "Project"を選択
3. GitHubリポジトリを選択
4. 設定：
   - **Framework Preset**: Vite
   - **Root Directory**: `.`（ルート）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を追加：
   - `VITE_API_BASE_URL`: バックエンドのURL（例: `https://your-app.railway.app`）
6. "Deploy"をクリック

### 4. 環境変数の最終設定

#### バックエンド（Railway/Render）

フロントエンドのURLを更新：
- `FRONTEND_URL`: VercelでデプロイしたURL（例: `https://your-app.vercel.app`）

#### フロントエンド（Vercel）

バックエンドのURLを更新：
- `VITE_API_BASE_URL`: Railway/RenderでデプロイしたURL

### 5. 初回ユーザーの作成

デプロイ後、初回ユーザーを作成する必要があります：

```bash
# Railway/Renderのコンソールで実行、またはローカルから実行
curl -X POST https://your-backend-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password",
    "name": "Your Name"
  }'
```

または、データ移行スクリプトを使用して既存のlocalStorageデータを移行：

1. `server/scripts/export-localStorage.html`をブラウザで開く
2. データをエクスポート
3. `server/data.json`として保存
4. Railway/Renderのコンソールで実行：
   ```bash
   cd server && npx tsx scripts/migrate-localStorage.ts
   ```

## 本番環境での注意事項

1. **HTTPS必須**: すべての通信はHTTPSで行われる必要があります
2. **CORS設定**: バックエンドの`FRONTEND_URL`を正しく設定してください
3. **データベースバックアップ**: Railway/Renderで自動バックアップが設定されているか確認
4. **環境変数の管理**: 機密情報は環境変数で管理し、コードに含めないでください
5. **ログ監視**: エラーログを定期的に確認してください

## トラブルシューティング

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- Prismaマイグレーションが実行されているか確認

### CORSエラー

- バックエンドの`FRONTEND_URL`が正しく設定されているか確認
- フロントエンドの`VITE_API_BASE_URL`が正しく設定されているか確認

### 認証エラー

- `JWT_SECRET`が設定されているか確認
- トークンの有効期限を確認
