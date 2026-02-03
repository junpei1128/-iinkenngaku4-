import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';
import emailRoutes from './routes/email.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import recipientRoutes from './routes/recipients.js';

// 環境変数を読み込む（serverディレクトリの.envファイル）
const envPath = resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('警告: .envファイルの読み込みに失敗しました:', result.error.message);
  console.warn('環境変数ファイルのパス:', envPath);
} else {
  console.log('環境変数ファイルを読み込みました:', envPath);
}

// DATABASE_URLが相対パスの場合、絶対パスに変換
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:./')) {
  const dbPath = resolve(process.cwd(), process.env.DATABASE_URL.replace('file:', ''));
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log('データベースパスを絶対パスに変換しました:', process.env.DATABASE_URL);
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定（フロントエンドからのリクエストを許可・複数オリジン対応）
const allowedOrigins = [
  'https://iinkenngaku4.vercel.app',
  process.env.FRONTEND_URL,
  'http://localhost:5185',
].filter((x): x is string => typeof x === 'string');

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : 'http://localhost:5185',
  credentials: true,
}));

// JSONボディパーサー（PDF Base64は大きくなりやすいため50mbに設定）
app.use(express.json({ limit: '50mb' }));

// ルートパス - サーバー情報ページ
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5185';
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>医院見学レポート管理システム API サーバー</title>
      <style>
        body {
          font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'MS PGothic', sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 3px solid #0066cc;
          padding-bottom: 10px;
        }
        .status {
          color: #28a745;
          font-weight: bold;
        }
        .endpoint {
          background-color: #f8f9fa;
          padding: 10px;
          margin: 10px 0;
          border-left: 4px solid #0066cc;
        }
        .frontend-link {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background-color: #0066cc;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        }
        .frontend-link:hover {
          background-color: #0052a3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>医院見学レポート管理システム API サーバー</h1>
        <p><span class="status">✓ サーバーは正常に動作しています</span></p>
        <p><strong>バージョン:</strong> 1.0.0</p>
        <h2>利用可能なエンドポイント</h2>
        <div class="endpoint">
          <strong>GET /health</strong><br>
          ヘルスチェックエンドポイント
        </div>
        <div class="endpoint">
          <strong>POST /api/send-notification</strong><br>
          メール通知送信エンドポイント
        </div>
        <div class="endpoint">
          <strong>POST /api/test-email</strong><br>
          メール送信機能テストエンドポイント（テスト用メールアドレスを送信）
        </div>
        <div class="endpoint">
          <strong>POST /api/auth/login</strong><br>
          ログインエンドポイント
        </div>
        <div class="endpoint">
          <strong>GET /api/reports</strong><br>
          レポート一覧取得
        </div>
        <div class="endpoint">
          <strong>GET /api/recipients</strong><br>
          通知先一覧取得
        </div>
        <a href="${frontendUrl}" class="frontend-link">フロントエンドアプリケーションを開く →</a>
      </div>
    </body>
    </html>
  `);
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// APIルート
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api', emailRoutes);

// エラーハンドリングミドルウェア
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // JSONパースエラーの場合
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('=== JSONパースエラー ===');
    console.error('エラーメッセージ:', err.message);
    console.error('リクエストURL:', req.url);
    console.error('リクエストメソッド:', req.method);
    console.error('========================');
    return res.status(400).json({ 
      error: 'リクエストの形式が正しくありません', 
      message: 'JSONの形式が正しくない可能性があります' 
    });
  }
  
  // リクエストボディサイズ超過（PDF保存時など）
  if (err.message && (err.message.includes('entity too large') || err.message.includes('payload too large') || err.message.includes('request entity too large'))) {
    console.error('リクエストボディがサイズ制限を超えています:', err.message);
    return res.status(413).json({
      error: '送信データが大きすぎます',
      message: 'PDFデータが大きすぎる可能性があります。しばらく待って再度お試しください。',
    });
  }

  // その他のエラー
  console.error('=== サーバーエラー発生 ===');
  console.error('エラーメッセージ:', err.message);
  console.error('エラースタック:', err.stack);
  console.error('リクエストURL:', req.url);
  console.error('リクエストメソッド:', req.method);
  if (req.body) {
    const bodyPreview = JSON.stringify(req.body, null, 2).substring(0, 500);
    console.error('リクエストボディ（最初の500文字）:', bodyPreview);
  }
  console.error('========================');
  res.status(500).json({ error: 'サーバーエラーが発生しました', message: err.message });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`フロントエンドURL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  
  // 環境変数の確認
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  
  console.log('\n=== 環境変数の確認 ===');
  console.log(`GMAIL_USER: ${gmailUser ? (gmailUser.includes('your-email') ? '未設定（プレースホルダー）' : '設定済み') : '未設定'}`);
  console.log(`GMAIL_APP_PASSWORD: ${gmailAppPassword ? (gmailAppPassword.includes('your_16_character') ? '未設定（プレースホルダー）' : `設定済み（${gmailAppPassword.length}文字）`) : '未設定'}`);
  
  if (!gmailUser || !gmailAppPassword || gmailUser.includes('your-email') || gmailAppPassword.includes('your_16_character')) {
    console.warn('\n⚠ 警告: GMAIL_USERまたはGMAIL_APP_PASSWORDが正しく設定されていません。');
    console.warn('メール送信機能を使用するには、server/.envファイルに以下を設定してください:');
    console.warn('  GMAIL_USER=your-actual-email@gmail.com');
    console.warn('  GMAIL_APP_PASSWORD=your_16_character_app_password');
    console.warn('詳細は server/README.md を参照してください。\n');
  } else {
    console.log('✓ Gmail認証情報が設定されています。\n');
  }

  // 簡易認証モードの確認
  const simpleAuthEmail = process.env.SIMPLE_AUTH_EMAIL;
  const simpleAuthPassword = process.env.SIMPLE_AUTH_PASSWORD;
  const isSimpleAuthEnabled = !!simpleAuthEmail && !!simpleAuthPassword;

  console.log('=== 簡易認証モードの確認 ===');
  console.log(`簡易認証モード: ${isSimpleAuthEnabled ? '有効' : '無効'}`);
  if (isSimpleAuthEnabled) {
    console.log(`設定メールアドレス: ${simpleAuthEmail}`);
    console.log(`パスワード: ${simpleAuthPassword ? '設定済み' : '未設定'}`);
    console.log(`ユーザー名: ${process.env.SIMPLE_AUTH_NAME || 'ユーザー（デフォルト）'}`);
    console.log(`ロール: ${process.env.SIMPLE_AUTH_ROLE || 'admin（デフォルト）'}`);
  } else {
    console.log('簡易認証モードを使用するには、.envファイルに以下を設定してください:');
    console.log('  SIMPLE_AUTH_EMAIL=your-email@example.com');
    console.log('  SIMPLE_AUTH_PASSWORD=your-password');
  }
  console.log('===========================\n');
});
