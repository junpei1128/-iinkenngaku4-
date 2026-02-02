# 歯科医院見学レポート管理システム

React + TypeScript + Vite で構築された医院見学レポート管理システムです。

## 機能

- 医院見学レポートの作成・編集・削除
- PDF生成・ダウンロード
- レポート完了時のメール通知（Gmail使用）
- 通知先の登録・管理
- 認証機能（通知先登録ページへのアクセス制御）

## セットアップ

> **⚠️ 重要**: サーバー起動で問題が発生している場合、まず [QUICK_START.md](QUICK_START.md) を参照してください。
> 段階的な手順とトラブルシューティングガイドが含まれています。
> 
> **状態確認**: プロジェクトの現在の状態を確認するには、`.\check-status.ps1` を実行してください。

### 1. 依存関係のインストール

```bash
# フロントエンド
npm install

# サーバー
cd server
npm install
```

### 2. 環境変数の設定

サーバー用の環境変数を設定します：

1. `server` ディレクトリに `.env` ファイルを作成
2. 以下の内容を記述：

```
PORT=3001
FRONTEND_URL=http://localhost:5185
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
```

詳細は [server/README.md](server/README.md) を参照してください。

### 3. サーバーの起動

#### 方法1: 統合起動スクリプト（推奨）

```powershell
.\start-dev.ps1
```

このスクリプトはフロントエンドとバックエンドを同時に起動し、起動前チェックも自動で実行します。

#### 方法2: 個別に起動

```bash
# バックエンド
cd server
npm run dev

# 別のターミナルでフロントエンド
npm run dev
```

### 4. アクセス

- **フロントエンド**: http://localhost:5185
- **バックエンド**: http://localhost:3001

## メール送信機能のテスト

メール送信機能をテストするには、Gmailアプリパスワードの設定が必要です。詳細な手順は `TEST_GUIDE.md` を参照してください。

### 簡単なテスト手順

1. **Gmailアプリパスワードの取得**
   - Googleアカウントで2段階認証を有効化
   - セキュリティ → アプリパスワードで生成
   - 16文字のパスワードをコピー

2. **環境変数の設定**
   - `server/.env` ファイルに `GMAIL_USER` と `GMAIL_APP_PASSWORD` を設定

3. **アプリケーションでのテスト**
   - ログイン（ID: `yamashita-j@consuldent.jp`, パスワード: `jyunpei1128`）
   - 通知先を登録
   - レポートを作成して完了
   - メールが送信されることを確認

## 開発

### 技術スタック

- **フロントエンド**: React 19, TypeScript, Vite, Tailwind CSS
- **バックエンド**: Node.js, Express, TypeScript
- **メール送信**: Gmail (nodemailer)
- **PDF生成**: jsPDF, html2canvas

### プロジェクト構造

```
├── src/                 # フロントエンドソースコード
│   ├── components/     # Reactコンポーネント
│   ├── pages/          # ページコンポーネント
│   ├── utils/          # ユーティリティ関数
│   └── types/          # TypeScript型定義
├── server/             # バックエンドサーバー
│   └── src/
│       ├── routes/     # APIルート
│       └── types/      # 型定義
└── README.md
```

## ライセンス

Private

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
