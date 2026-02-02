# フロントエンド起動エラー修正手順

## 問題
esbuildのspawn EPERMエラーが発生し、フロントエンドが起動できません。

## 解決方法

### 方法1: node_modulesを再インストール（推奨）

以下のコマンドを実行してください：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4
Remove-Item -Path node_modules -Recurse -Force
Remove-Item -Path package-lock.json -Force
npm install
npm run dev
```

### 方法2: esbuildのみ再インストール

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4
npm install esbuild --force
npm run dev
```

### 方法3: 管理者権限で実行

PowerShellを管理者権限で開き、以下を実行：

```powershell
cd c:\Users\yamashita-j\Desktop\Cursortest\iinkenngaku4
npm run dev
```

## 現在の状態

- ✅ バックエンドサーバー: 正常に起動中（http://localhost:3001）
- ❌ フロントエンド: esbuildの権限エラーで起動できていません

## 修正済み

- `vite.config.ts`を`vite.config.js`に変更（TypeScript設定ファイルの問題を回避）

## 次のステップ

上記のいずれかの方法でフロントエンドを起動してください。起動後、ブラウザで http://localhost:5185 にアクセスして動作確認を行ってください。
