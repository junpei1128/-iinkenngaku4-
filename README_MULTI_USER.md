# 複数人同時利用対応システム

## 概要

このシステムは、複数のユーザーが同時にアクセスしてレポートを作成・編集できるように設計されています。

## 主な機能

### 1. データベースによる一元管理
- すべてのデータがサーバー側のデータベース（SQLite/PostgreSQL）に保存されます
- 複数のユーザーが同じデータにアクセスできます
- ブラウザを変更してもデータにアクセス可能です

### 2. 同時編集の競合制御
- 楽観的ロック（Optimistic Locking）を実装
- 複数人が同じレポートを編集しようとすると、競合が検出されます
- 「他のユーザーが編集しています」という警告が表示され、最新データを再読み込みできます

### 3. JWT認証システム
- セキュアな認証システム
- パスワードはハッシュ化されて保存されます
- トークンベースの認証で、セッション管理が容易です

### 4. ユーザー管理
- 複数のユーザーを登録可能
- 各ユーザーは自分のレポートと通知先を管理
- 管理者権限の設定が可能

## 技術スタック

### バックエンド
- **Node.js + Express**: APIサーバー
- **Prisma**: ORM（データベース操作）
- **SQLite**: 開発環境用データベース
- **PostgreSQL**: 本番環境用データベース（推奨）
- **JWT**: 認証トークン
- **bcrypt**: パスワードハッシュ化

### フロントエンド
- **React + TypeScript**: UIフレームワーク
- **Vite**: ビルドツール
- **API経由**: すべてのデータ操作がAPI経由

## セットアップ

詳細は [SETUP_GUIDE.md](SETUP_GUIDE.md) を参照してください。

### クイックスタート

```bash
# 1. 依存関係のインストール
npm install
cd server && npm install

# 2. 環境変数の設定
# server/.env ファイルを作成して設定

# 3. データベースの初期化
cd server
npm run generate
npm run migrate:dev

# 4. 初回ユーザーの作成
npm run create-user

# 5. サーバーの起動
npm run dev

# 6. フロントエンドの起動（別ターミナル）
cd ..
npm run dev
```

## APIエンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - ユーザー登録
- `GET /api/auth/me` - 現在のユーザー情報取得

### レポート
- `GET /api/reports` - レポート一覧取得
- `GET /api/reports/:id` - レポート詳細取得
- `POST /api/reports` - レポート作成
- `PUT /api/reports/:id` - レポート更新（競合チェック付き）
- `DELETE /api/reports/:id` - レポート削除

### 通知先
- `GET /api/recipients` - 通知先一覧取得
- `POST /api/recipients` - 通知先作成
- `PUT /api/recipients/:id` - 通知先更新
- `DELETE /api/recipients/:id` - 通知先削除

### メール送信
- `POST /api/send-notification` - レポート完了通知送信
- `POST /api/test-email` - メール送信テスト

## 同時編集の動作

1. ユーザーAがレポートを開く（バージョン1を取得）
2. ユーザーBが同じレポートを開く（バージョン1を取得）
3. ユーザーAが保存（バージョン2に更新）
4. ユーザーBが保存しようとする
   - サーバーがバージョンをチェック
   - バージョンが異なるため、409 Conflictエラーを返す
   - ユーザーBに「他のユーザーが編集しています」と表示
   - 最新データを再読み込みするオプションを提供

## デプロイメント

詳細は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

### 推奨構成
- **フロントエンド**: Vercel
- **バックエンド**: Railway または Render
- **データベース**: PostgreSQL（Railway/Renderで提供）

## データ移行

既存のlocalStorageデータを移行する場合：

1. `server/scripts/export-localStorage.html`をブラウザで開く
2. データをエクスポート
3. `server/data.json`として保存
4. `npm run migrate:localStorage`を実行

## セキュリティ

- パスワードはbcryptでハッシュ化
- JWTトークンによる認証
- SQLインジェクション対策（Prisma ORM）
- XSS対策（Reactのデフォルト機能）
- CORS設定で適切なオリジンのみ許可

## パフォーマンス

- データベースインデックスによる高速検索
- 楽観的ロックによる競合制御（高パフォーマンス）
- 必要に応じてページネーション実装可能
