import express from 'express';
import { prisma } from '../lib/prisma.js';
import { generateToken, hashPassword, verifyPassword, authenticate } from '../lib/auth.js';

const router = express.Router();

// 環境変数を読み込む関数（遅延評価）
const getSimpleAuthConfig = () => {
  const email = process.env.SIMPLE_AUTH_EMAIL;
  const password = process.env.SIMPLE_AUTH_PASSWORD;
  const name = process.env.SIMPLE_AUTH_NAME || 'ユーザー';
  const role = process.env.SIMPLE_AUTH_ROLE || 'admin';
  
  return {
    email,
    password,
    name,
    role,
    isEnabled: !!email && !!password,
  };
};

// ログイン
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
    }

    // 簡易認証モードの設定を取得（遅延評価）
    const simpleAuth = getSimpleAuthConfig();

    // デバッグログ
    console.log('=== ログイン試行 ===');
    console.log('簡易認証モード有効:', simpleAuth.isEnabled);
    if (simpleAuth.isEnabled) {
      console.log('設定メールアドレス:', simpleAuth.email);
      console.log('入力メールアドレス:', email);
      console.log('設定パスワード:', simpleAuth.password ? '***' : '未設定');
      console.log('入力パスワード:', password ? '***' : '未入力');
    }

    // 簡易認証モードが有効な場合
    if (simpleAuth.isEnabled && simpleAuth.email && simpleAuth.password) {
      const emailMatch = email.trim() === simpleAuth.email.trim();
      const passwordMatch = password === simpleAuth.password;
      
      console.log('メールアドレス一致:', emailMatch);
      console.log('パスワード一致:', passwordMatch);
      
      if (emailMatch && passwordMatch) {
        const simpleUserId = 'simple-auth-user';
        const token = generateToken({
          userId: simpleUserId,
          email: simpleAuth.email,
          role: simpleAuth.role,
        });
        console.log('簡易認証モード: ログイン成功');
        return res.json({
          success: true,
          token,
          user: {
            id: simpleUserId,
            email: simpleAuth.email,
            name: simpleAuth.name,
            role: simpleAuth.role,
          },
        });
      } else {
        console.log('簡易認証モード: 認証失敗（メールアドレスまたはパスワードが一致しません）');
        return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
      }
    }

    // 通常のデータベース認証（簡易認証モードが無効な場合）
    // ユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワードを検証
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // JWTトークンを生成
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('ログインエラー:', error);
    // エラーの詳細をログに記録
    if (error.message) {
      console.error('エラーメッセージ:', error.message);
    }
    res.status(500).json({ error: 'ログインに失敗しました', message: error.message || 'サーバーエラーが発生しました' });
  }
});

// ユーザー登録（初回セットアップ用）
router.post('/register', async (req: express.Request, res: express.Response) => {
  // 簡易認証モードの設定を取得（遅延評価）
  const simpleAuth = getSimpleAuthConfig();
  
  // 簡易認証モードが有効な場合、登録は不要
  if (simpleAuth.isEnabled) {
    return res.status(400).json({ error: '簡易認証モードが有効なため、ユーザー登録は不要です' });
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
    }

    // 既存ユーザーをチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        role: 'user',
      },
    });

    // JWTトークンを生成
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('ユーザー登録エラー:', error);
    res.status(500).json({ error: 'ユーザー登録に失敗しました' });
  }
});

// 現在のユーザー情報取得
router.get('/me', authenticate, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    
    // 簡易認証モードの設定を取得（遅延評価）
    const simpleAuth = getSimpleAuthConfig();
    
    // 簡易認証モードの場合
    if (simpleAuth.isEnabled && user.userId === 'simple-auth-user') {
      return res.json({
        success: true,
        user: {
          id: user.userId,
          email: simpleAuth.email,
          name: simpleAuth.name,
          role: simpleAuth.role,
          createdAt: new Date(),
        },
      });
    }

    // 通常のデータベース認証
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!userData) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    res.json({ success: true, user: userData });
  } catch (error: any) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({ error: 'ユーザー情報の取得に失敗しました' });
  }
});

// デバッグ用: 簡易認証モードの状態確認（開発環境のみ）
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  router.get('/auth/debug', (req, res) => {
    const simpleAuth = getSimpleAuthConfig();
    res.json({
      simpleAuthEnabled: simpleAuth.isEnabled,
      email: simpleAuth.email || '未設定',
      password: simpleAuth.password ? '設定済み' : '未設定',
      name: simpleAuth.name,
      role: simpleAuth.role,
    });
  });
}

export default router;
