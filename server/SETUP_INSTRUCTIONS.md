# サーバー設定手順

## クイックスタート

1. **環境変数ファイルの作成**
   ```bash
   # env.templateから.envファイルを作成（既に作成済み）
   # または手動で.envファイルを作成
   ```

2. **.envファイルの編集**
   - `GMAIL_USER`: Gmailアドレスを設定
   - `GMAIL_APP_PASSWORD`: Gmailアプリパスワード（16文字）を設定

3. **依存関係のインストール**
   ```bash
   npm install
   ```

4. **サーバーの起動**
   ```bash
   npm run dev
   ```

## 詳細手順

詳細なテスト手順は、プロジェクトルートの `TEST_GUIDE.md` を参照してください。

## 現在の設定

現在の`.env`ファイルにはデフォルト値が設定されています：

- `GMAIL_USER=your-email@gmail.com` ← **実際のGmailアドレスに置き換えてください**
- `GMAIL_APP_PASSWORD=your_16_character_app_password` ← **Gmailアプリパスワードに置き換えてください**

## 次のステップ

1. Gmailで2段階認証を有効化
2. アプリパスワードを生成（Googleアカウント → セキュリティ → アプリパスワード）
3. `.env`ファイルを編集
4. サーバーを再起動

詳細は `TEST_GUIDE.md` を参照してください。
