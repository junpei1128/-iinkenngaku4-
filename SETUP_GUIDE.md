# 複数人同時利用対応システム セットアップガイド

## 初回セットアップ手順

### 1. 依存関係のインストール

```bash
# フロントエンド
npm install

# サーバー
cd server
npm install
```

### 2. 環境変数の設定

`server/.env`ファイルを作成し、以下の内容を設定：

```env
PORT=3001
FRONTEND_URL=http://localhost:5185
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_jwt_secret_key_here
```

**JWT_SECRETの生成方法:**
```bash
# Windows (PowerShell)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Mac/Linux
openssl rand -base64 32
```

### 3. データベースの初期化

```bash
cd server
npm run generate
npm run migrate:dev
```

### 4. 初回ユーザーの作成

```bash
cd server
npm run create-user
```

デフォルトで以下のユーザーが作成されます：
- メールアドレス: `yamashita-j@consuldent.jp`
- パスワード: `jyunpei1128`

カスタムユーザーを作成する場合：
```bash
INITIAL_EMAIL=your-email@example.com INITIAL_PASSWORD=your-password npm run create-user
```

### 5. 既存データの移行（オプション）

localStorageに既存データがある場合：

1. `server/scripts/export-localStorage.html`をブラウザで開く
2. 「データをエクスポート」をクリック
3. ダウンロードしたJSONファイルを`server/data.json`として保存
4. 移行スクリプトを実行：
   ```bash
   cd server
   npm run migrate-data
   ```

### 6. サーバーの起動

```bash
cd server
npm run dev
```

### 7. フロントエンドの起動

別のターミナルで：

```bash
npm run dev
```

## 動作確認

1. ブラウザで http://localhost:5185 にアクセス
2. ログインページで初回ユーザーのメールアドレスとパスワードでログイン
3. 通知先を登録
4. レポートを作成・編集・完了
5. メール送信を確認

## 複数ユーザーでのテスト

1. 新しいユーザーを登録：
   ```bash
   cd server
   INITIAL_EMAIL=new-user@example.com INITIAL_PASSWORD=password123 npm run create-user
   ```

2. 別のブラウザ（またはシークレットモード）でログイン
3. 同じレポートを同時に編集して、競合制御が機能するか確認

## トラブルシューティング

### データベースエラー

- `DATABASE_URL`が正しく設定されているか確認
- `npm run migrate:dev`を実行してマイグレーションを適用

### 認証エラー

- `JWT_SECRET`が設定されているか確認
- トークンが有効期限内か確認（7日間）

### メール送信エラー

- `GMAIL_USER`と`GMAIL_APP_PASSWORD`が正しく設定されているか確認
- アプリパスワードが16文字で、スペースが含まれていないか確認
