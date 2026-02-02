import express from 'express';
import nodemailer from 'nodemailer';
import type { SendNotificationRequest } from '../types/index.js';
import { authenticate } from '../lib/auth.js';

const router = express.Router();

// Gmail SMTP設定（遅延評価）
let transporter: nodemailer.Transporter | null = null;
let transporterVerified = false;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }
  
  const gmailUser = process.env.GMAIL_USER;
  let gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailAppPassword) {
    console.error('Gmail認証情報が設定されていません');
    console.error('GMAIL_USER:', gmailUser ? '設定済み' : '未設定');
    console.error('GMAIL_APP_PASSWORD:', gmailAppPassword ? '設定済み' : '未設定');
    return null;
  }
  
  // アプリパスワードの前後の空白とスペースを削除
  gmailAppPassword = gmailAppPassword.trim().replace(/\s+/g, '');
  
  // アプリパスワードの検証（16文字または17文字を許可）
  const passwordLength = gmailAppPassword.length;
  const passwordPreview = gmailAppPassword.substring(0, 4) + '***' + gmailAppPassword.substring(passwordLength - 4);
  
  console.log('Gmail認証情報を確認:', {
    user: gmailUser,
    passwordLength,
    passwordPreview,
    isValidLength: passwordLength === 16 || passwordLength === 17,
  });
  
  // 16文字または17文字を許可（一部のアプリパスワードは17文字の場合がある）
  if (passwordLength < 16 || passwordLength > 17) {
    console.error(`エラー: アプリパスワードの長さが${passwordLength}文字です。16-17文字である必要があります。`);
    console.error('アプリパスワードの取得方法:');
    console.error('1. Googleアカウントのセキュリティ設定にアクセス');
    console.error('2. 2段階認証を有効化');
    console.error('3. アプリパスワードを生成（「その他（カスタム名）」を選択）');
    console.error('4. 表示されたパスワードをコピー（スペースを削除して設定）');
    return null;
  }
  
  try {
    // service: 'gmail'を使用（nodemailerが自動的に最適な設定を選択）
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
    
    console.log('Gmail SMTP transporterが作成されました（service: gmail）');
    
    return transporter;
  } catch (error: any) {
    console.error('Gmail transporter作成エラー:', error);
    transporter = null;
    transporterVerified = false;
    return null;
  }
}

// 無効なドメインのリスト（よくあるテスト用・例示用ドメイン）
const INVALID_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.org',
  'localhost',
  'invalid.com',
  'invalid.org',
  'sample.com',
  'sample.org',
  'dummy.com',
  'dummy.org',
];

// よくある無効なメールアドレスのパターン
const INVALID_EMAIL_PATTERNS = [
  /^test@/i,
  /^example@/i,
  /^sample@/i,
  /^dummy@/i,
  /@example\.(com|org|net)$/i,
  /@test\.(com|org)$/i,
  /@localhost$/i,
  /@invalid\.(com|org)$/i,
  /@sample\.(com|org)$/i,
  /@dummy\.(com|org)$/i,
];

/**
 * メールアドレスの妥当性を検証
 * @param email 検証するメールアドレス
 * @returns 検証結果 { valid: boolean, reason?: string }
 */
function validateEmailAddress(email: string): { valid: boolean; reason?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'メールアドレスが指定されていません' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // 基本的な形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, reason: 'メールアドレスの形式が正しくありません' };
  }

  // ドメイン部分を抽出
  const domain = trimmedEmail.split('@')[1];
  if (!domain) {
    return { valid: false, reason: 'ドメインが指定されていません' };
  }

  // 無効なドメインのチェック
  if (INVALID_DOMAINS.includes(domain)) {
    return { 
      valid: false, 
      reason: `無効なドメインです: ${domain}。実際に存在するメールアドレスを指定してください。` 
    };
  }

  // 無効なメールアドレスのパターンチェック
  for (const pattern of INVALID_EMAIL_PATTERNS) {
    if (pattern.test(trimmedEmail)) {
      return { 
        valid: false, 
        reason: `無効なメールアドレスです: ${trimmedEmail}。実際に存在するメールアドレスを指定してください。` 
      };
    }
  }

  return { valid: true };
}

async function verifyTransporter(mailTransporter: nodemailer.Transporter): Promise<{ success: boolean; error?: any }> {
  try {
    await mailTransporter.verify();
    console.log('✓ Gmail SMTP接続が正常に確立されました');
    return { success: true };
  } catch (verifyError: any) {
    console.error('✗ Gmail SMTP接続検証に失敗しました');
    console.error('検証エラー詳細:', {
      message: verifyError.message,
      code: verifyError.code,
      command: verifyError.command,
      response: verifyError.response,
      responseCode: verifyError.responseCode,
    });
    
    // 認証エラーの場合は早期にエラーを返す
    if (verifyError.code === 'EAUTH' || verifyError.responseCode === 535) {
      return {
        success: false,
        error: {
          code: 'EAUTH',
          message: 'Gmail認証に失敗しました',
          details: 'アプリパスワードが正しいか、2段階認証が有効か確認してください。',
          response: verifyError.response,
        },
      };
    }
    
    return {
      success: false,
      error: {
        code: verifyError.code || 'UNKNOWN',
        message: verifyError.message || 'SMTP接続検証に失敗しました',
        responseCode: verifyError.responseCode,
      },
    };
  }
}

// メール送信ルート（認証が必要）
router.post('/send-notification', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    // リクエスト情報をログ出力（デバッグ用）
    console.log('=== メール送信リクエスト受信 ===');
    console.log('リクエスト情報:', {
      hasRecipients: !!req.body.recipients,
      recipientsCount: req.body.recipients?.length || 0,
      hasReport: !!req.body.report,
      reportKeys: req.body.report ? Object.keys(req.body.report) : [],
      hasReportLink: !!req.body.reportLink,
      hasPdfData: !!req.body.pdfData,
      hasShareToken: !!req.body.shareToken,
    });
    
    const { recipients, report, reportLink, pdfData, shareToken }: SendNotificationRequest = req.body;

    // バリデーション
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: '通知先が指定されていません' });
    }

    if (!report || !report.myClinicName || !report.clinicName || !report.prefecture || !report.city) {
      return res.status(400).json({ error: 'レポート情報が不正です' });
    }

    if (!reportLink) {
      return res.status(400).json({ error: 'レポートリンクが指定されていません' });
    }

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      return res.status(500).json({ 
        success: false,
        error: 'メール送信サービスが設定されていません。GMAIL_USERとGMAIL_APP_PASSWORDを設定してください。',
        details: 'Gmail認証情報が正しく設定されていないか、transporterの作成に失敗しました。'
      });
    }
    
    // verify()は最初の送信時に試行（過去の成功例では、verify()が失敗しても実際の送信は成功する場合がある）
    // そのため、verify()が失敗しても実際の送信を試みる
    if (!transporterVerified) {
      console.log('Gmail SMTP接続を検証中...');
      const verifyResult = await verifyTransporter(mailTransporter);
      
      if (!verifyResult.success) {
        const errorInfo = verifyResult.error!;
        // 認証エラーの場合でも、実際の送信を試みる（過去に成功していたため）
        console.warn('⚠ Gmail SMTP接続検証に失敗しましたが、実際のメール送信を試みます');
        console.warn('検証エラー:', errorInfo.message || '不明なエラー');
      } else {
        console.log('✓ Gmail SMTP接続検証成功');
      }
      
      transporterVerified = true; // 一度検証したら再検証しない
    }

    // メール文面を作成（指定された形式）
    const emailSubject = '医院見学レポート完了のお知らせ';
    
    // PDF添付の文言を追加
    const pdfAttachmentText = pdfData ? '\n\nPDFを添付しましたのでご確認ください。' : '';
    const pdfAttachmentHtml = pdfData ? '<p>PDFを添付しましたのでご確認ください。</p>' : '';
    
    const emailText = `「${report.myClinicName}」様が、「${report.prefecture}${report.city}」の「${report.clinicName}」に医院見学に行きました。
その内容のレポートが完了しましたのでご報告いたします。${pdfAttachmentText}

また、下記リンクからもブラウザでご確認いただけます（認証不要）:
${reportLink}`;

    const emailHtml = `
      <div style="font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'MS PGothic', sans-serif; line-height: 1.6; color: #333;">
        <p>「${report.myClinicName}」様が、「${report.prefecture}${report.city}」の「${report.clinicName}」に医院見学に行きました。</p>
        <p>その内容のレポートが完了しましたのでご報告いたします。</p>
        ${pdfAttachmentHtml}
        <br>
        <p>また、下記リンクからもブラウザでご確認いただけます（認証不要）:</p>
        <p><a href="${reportLink}" style="color: #0066cc; text-decoration: underline;">${reportLink}</a></p>
      </div>
    `;

    // メールアドレスの検証とフィルタリング
    const gmailUser = process.env.GMAIL_USER || 'noreply@example.com';
    console.log(`メール送信を開始: ${recipients.length}件の通知先`);
    
    const validRecipients: Array<{ recipient: typeof recipients[0]; index: number }> = [];
    const invalidRecipients: Array<{ recipient: typeof recipients[0]; reason: string }> = [];

    // 各メールアドレスを検証
    recipients.forEach((recipient, index) => {
      const validation = validateEmailAddress(recipient.email);
      if (validation.valid) {
        validRecipients.push({ recipient, index });
      } else {
        invalidRecipients.push({ recipient, reason: validation.reason || '無効なメールアドレス' });
        console.warn(`[${index + 1}/${recipients.length}] 無効なメールアドレスを検出: ${recipient.email} - ${validation.reason}`);
      }
    });

    if (validRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: '有効なメールアドレスがありません',
        details: 'すべてのメールアドレスが無効です。実際に存在するメールアドレスを指定してください。',
        invalidRecipients: invalidRecipients.map(({ recipient, reason }) => ({
          email: recipient.email,
          name: recipient.name,
          reason,
        })),
      });
    }

    console.log(`有効なメールアドレス: ${validRecipients.length}件`);
    console.log(`無効なメールアドレス: ${invalidRecipients.length}件`);
    if (invalidRecipients.length > 0) {
      console.log('無効なメールアドレス一覧:', invalidRecipients.map(({ recipient }) => recipient.email).join(', '));
    }
    console.log('送信先:', validRecipients.map(({ recipient }) => recipient.email).join(', '));

    // PDF添付の準備
    const attachments = pdfData ? [{
      filename: `レポート_${report.clinicName}_${report.visitDate}.pdf`,
      content: pdfData,
      encoding: 'base64',
    }] : [];

    // 各通知先にメールを送信（Promise.allSettledを使用して個別に追跡）
    const emailPromises = validRecipients.map(({ recipient, index }) => {
      const mailOptions = {
        from: gmailUser,
        to: recipient.email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      console.log(`[${index + 1}/${recipients.length}] メール送信中: ${recipient.email}`);
      return mailTransporter.sendMail(mailOptions)
        .then((result) => {
          console.log(`[${index + 1}/${recipients.length}] メール送信成功: ${recipient.email}`, result.messageId);
          return {
            success: true,
            email: recipient.email,
            name: recipient.name,
            messageId: result.messageId,
          };
        })
        .catch((error) => {
          console.error(`[${index + 1}/${recipients.length}] メール送信失敗: ${recipient.email}`, error);
          return {
            success: false,
            email: recipient.email,
            name: recipient.name,
            error: error.message || 'メール送信に失敗しました',
            code: error.code,
            responseCode: error.responseCode,
          };
        });
    });

    // すべてのメール送信を実行（一部失敗しても続行）
    const results = await Promise.allSettled(emailPromises);
    
    // 結果を集計
    const successful: Array<{ email: string; name: string; messageId: string }> = [];
    const failed: Array<{ email: string; name: string; reason: string }> = [];

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const emailResult = result.value;
        if (emailResult.success && 'messageId' in emailResult) {
          successful.push({
            email: emailResult.email,
            name: emailResult.name,
            messageId: emailResult.messageId,
          });
        } else if (!emailResult.success && 'error' in emailResult) {
          failed.push({
            email: emailResult.email,
            name: emailResult.name,
            reason: emailResult.error || 'メール送信に失敗しました',
          });
        }
      } else {
        const { recipient } = validRecipients[idx];
        failed.push({
          email: recipient.email,
          name: recipient.name,
          reason: result.reason?.toString() || '予期しないエラーが発生しました',
        });
      }
    });

    console.log(`メール送信結果: 成功 ${successful.length}件, 失敗 ${failed.length}件`);
    if (failed.length > 0) {
      console.log('失敗したメールアドレス:', failed.map(f => f.email).join(', '));
    }

    // 無効なメールアドレスも失敗として含める
    invalidRecipients.forEach(({ recipient, reason }) => {
      failed.push({
        email: recipient.email,
        name: recipient.name,
        reason,
      });
    });

    // レスポンスを返す
    if (successful.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'すべてのメール送信に失敗しました',
        details: 'メールアドレスを確認してください。',
        successful: [],
        failed: failed.map(f => ({ email: f.email, name: f.name, reason: f.reason })),
        invalidRecipients: invalidRecipients.map(({ recipient, reason }) => ({
          email: recipient.email,
          name: recipient.name,
          reason,
        })),
      });
    }

    // 一部成功、一部失敗の場合
    const hasFailures = failed.length > 0;
    res.json({
      success: !hasFailures,
      message: hasFailures
        ? `${successful.length}件のメールを送信しましたが、${failed.length}件の送信に失敗しました`
        : `${successful.length}件のメールを送信しました`,
      sentCount: successful.length,
      failedCount: failed.length,
      successful: successful.map(s => ({ email: s.email, name: s.name })),
      failed: failed.map(f => ({ email: f.email, name: f.name, reason: f.reason })),
    });
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    console.error('エラー詳細:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    });
    
    // より詳細なエラーメッセージを返す
    let errorMessage = 'メール送信に失敗しました';
    let errorDetails = error.message || '不明なエラーが発生しました';
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Gmail認証に失敗しました';
      errorDetails = 'アプリパスワードが正しいか、2段階認証が有効か確認してください。';
      if (error.response) {
        errorDetails += ` (${error.response})`;
      }
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Gmailサーバーに接続できませんでした';
      errorDetails = 'ネットワーク接続を確認してください。';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Gmailサーバーへの接続がタイムアウトしました';
      errorDetails = 'ネットワーク接続またはファイアウォール設定を確認してください。';
    } else if (error.responseCode === 550) {
      errorMessage = 'メールアドレスが無効です';
      errorDetails = '送信先のメールアドレスを確認してください。';
    } else if (error.message) {
      errorMessage = `メール送信に失敗しました: ${error.message}`;
      errorDetails = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: error.code || 'UNKNOWN',
      responseCode: error.responseCode,
    });
  }
});

// テスト用エンドポイント: メール送信機能をテスト
router.post('/test-email', async (req: express.Request, res: express.Response) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail || typeof testEmail !== 'string' || !testEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: '有効なテスト用メールアドレスを指定してください',
      });
    }

    // メールアドレスの検証
    const validation = validateEmailAddress(testEmail);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: '無効なメールアドレスです',
        details: validation.reason || '実際に存在するメールアドレスを指定してください。',
      });
    }

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      return res.status(500).json({
        success: false,
        error: 'メール送信サービスが設定されていません。GMAIL_USERとGMAIL_APP_PASSWORDを設定してください。',
        details: 'Gmail認証情報が正しく設定されていないか、transporterの作成に失敗しました。',
      });
    }

    // 接続を検証
    console.log('テスト: Gmail SMTP接続を検証中...');
    const verifyResult = await verifyTransporter(mailTransporter);
    
    if (!verifyResult.success) {
      const errorInfo = verifyResult.error!;
      return res.status(500).json({
        success: false,
        error: errorInfo.message,
        details: errorInfo.details || errorInfo.message,
        code: errorInfo.code,
        response: errorInfo.response,
      });
    }

    // テストメールを送信
    const gmailUser = process.env.GMAIL_USER;
    const testSubject = 'メール送信テスト';
    const testText = 'これはメール送信機能のテストメールです。\n\nこのメールが届いていれば、メール送信機能は正常に動作しています。';
    const testHtml = `
      <div style="font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'MS PGothic', sans-serif; line-height: 1.6; color: #333;">
        <p>これはメール送信機能のテストメールです。</p>
        <p>このメールが届いていれば、メール送信機能は正常に動作しています。</p>
      </div>
    `;

    console.log(`テスト: メール送信中: ${testEmail}`);
    const result = await mailTransporter.sendMail({
      from: gmailUser,
      to: testEmail,
      subject: testSubject,
      text: testText,
      html: testHtml,
    });

    console.log('✓ テストメール送信成功:', result.messageId);

    return res.json({
      success: true,
      message: 'テストメールを送信しました',
      messageId: result.messageId,
      to: testEmail,
    });
  } catch (error: any) {
    console.error('テストメール送信エラー:', error);
    
    let errorMessage = 'テストメール送信に失敗しました';
    let errorDetails = error.message || '不明なエラーが発生しました';
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Gmail認証に失敗しました';
      errorDetails = 'アプリパスワードが正しいか、2段階認証が有効か確認してください。';
      if (error.response) {
        errorDetails += ` (${error.response})`;
      }
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Gmailサーバーに接続できませんでした';
      errorDetails = 'ネットワーク接続を確認してください。';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Gmailサーバーへの接続がタイムアウトしました';
      errorDetails = 'ネットワーク接続またはファイアウォール設定を確認してください。';
    } else if (error.responseCode === 550) {
      errorMessage = 'メールアドレスが無効です';
      errorDetails = '送信先のメールアドレスを確認してください。';
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: error.code || 'UNKNOWN',
      responseCode: error.responseCode,
    });
  }
});

export default router;
