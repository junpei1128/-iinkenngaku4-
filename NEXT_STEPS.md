# 本番環境アップ：次のステップ（schema 変更後の手順）

PostgreSQL 対応（schema.prisma 変更）が済んだあとの具体的な手順です。

---

## ステップ1: コードを GitHub にプッシュする

1. GitHub で新しいリポジトリを作成（https://github.com/new）
   - リポジトリ名を入力（例: `iinkenngaku4`）
   - 「Add a README」は付けずに作成

2. プロジェクトフォルダで PowerShell を開き、次を実行（`<ユーザー名>` と `<リポジトリ名>` を自分のものに置き換える）:

```powershell
git init
git add .
git commit -m "PostgreSQL対応・本番用"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

※ すでに `git init` や `remote` を設定済みの場合は、以下だけ実行:
```powershell
git add .
git commit -m "PostgreSQL対応・本番用"
git push -u origin main
```

---

## ステップ2: Railway でバックエンドをデプロイする

1. https://railway.app にログイン（GitHub でログイン）

2. **New Project** → **Deploy from GitHub repo** → さきほどプッシュしたリポジトリを選択

3. **PostgreSQL を追加**
   - プロジェクト内で **+ New** → **Database** → **Add PostgreSQL**
   - PostgreSQL のサービスをクリック → **Variables** タブで **DATABASE_URL** の値をコピーしてメモ

4. **バックエンド用サービス（GitHub からデプロイした方）の設定**
   - そのサービスをクリック → **Settings**
   - **Root Directory**: `server` と入力
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

5. **環境変数を設定**（同じサービスの **Variables** タブ）
   - **+ New Variable** で以下を追加:

   | 変数名 | 値 |
   |--------|-----|
   | DATABASE_URL | ステップ3でコピーした PostgreSQL の接続URL |
   | JWT_SECRET | 32文字以上のランダムな文字列（パスワード生成サイト等で作成） |
   | FRONTEND_URL | 仮で `https://example.vercel.app`（あとで Vercel の URL に差し替え） |
   | GMAIL_USER | 送信に使う Gmail アドレス |
   | GMAIL_APP_PASSWORD | Gmail のアプリパスワード（16文字） |

6. **公開 URL を発行**
   - 同じサービスの **Settings** → **Networking** で **Generate Domain** をクリック
   - 表示された URL（例: `https://xxxx.railway.app`）をメモ → これが**バックエンドの URL**

7. **本番 DB にテーブルを作成**
   - 同じサービスの **Shell** または **Run Command** を開く
   - 次を実行: `npx prisma db push`
   - 成功したらテーブルが作成されます

---

## ステップ3: Vercel でフロントエンドをデプロイする

1. https://vercel.com にログイン（GitHub でログイン）

2. **Add New** → **Project** → 同じ GitHub リポジトリを選択 → **Import**

3. **設定**
   - Framework Preset: **Vite**
   - Root Directory: そのまま（`.`）
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **環境変数**
   - **Environment Variables** で **Name**: `VITE_API_BASE_URL`、**Value**: ステップ2でメモした **Railway の URL**（例: `https://xxxx.railway.app`）

5. **Deploy** をクリック → 完了後、表示される URL（例: `https://yyyy.vercel.app`）をメモ → これが**フロントの URL**

---

## ステップ4: CORS 用に環境変数をそろえる

1. **Railway** のバックエンドサービスの **Variables** を開く
2. **FRONTEND_URL** の値を、ステップ3でメモした **Vercel の URL**（例: `https://yyyy.vercel.app`）に変更して保存
3. 必要に応じて再デプロイされるのを待つ

---

## ステップ5: 初回ユーザーを作成する

PowerShell で実行（`<バックエンドのURL>` を Railway の URL に置き換える）:

```powershell
curl -X POST "https://<バックエンドのURL>/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"あなたのメール@example.com\",\"password\":\"好きなパスワード\",\"name\":\"あなたの名前\"}"
```

例:
```powershell
curl -X POST "https://xxxx.railway.app/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"admin@example.com\",\"password\":\"MyPassword123\",\"name\":\"管理者\"}"
```

成功すると JSON で `"success": true` などが返ります。

---

## ステップ6: 動作確認

1. ブラウザで **Vercel の URL**（例: `https://yyyy.vercel.app`）を開く
2. ステップ5で登録したメールとパスワードでログインできることを確認

---

## チェックリスト

- [ ] ステップ1: GitHub にプッシュした
- [ ] ステップ2: Railway で PostgreSQL とバックエンドをデプロイし、`npx prisma db push` を実行した
- [ ] ステップ3: Vercel でフロントをデプロイし、`VITE_API_BASE_URL` に Railway の URL を設定した
- [ ] ステップ4: Railway の `FRONTEND_URL` に Vercel の URL を設定した
- [ ] ステップ5: `/api/auth/register` で初回ユーザーを作成した
- [ ] ステップ6: Vercel の URL からログインできることを確認した
