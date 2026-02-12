import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../lib/auth.js';

const router = express.Router();

// すべてのエンドポイントで認証が必要
router.use(authenticate);

// 簡易認証モード用のユーザーをデータベースに作成するヘルパー関数
const ensureSimpleAuthUser = async (user: any): Promise<string> => {
  if (user.userId === 'simple-auth-user') {
    const simpleAuthEmail = process.env.SIMPLE_AUTH_EMAIL;
    const simpleAuthName = process.env.SIMPLE_AUTH_NAME || 'ユーザー';
    const simpleAuthRole = process.env.SIMPLE_AUTH_ROLE || 'admin';

    // 簡易認証モード用のユーザーが存在するか確認
    let dbUser = await prisma.user.findUnique({
      where: { id: 'simple-auth-user' },
    });

    // 存在しない場合は作成
    if (!dbUser) {
      console.log('簡易認証モード用のユーザーをデータベースに作成します');
      dbUser = await prisma.user.create({
        data: {
          id: 'simple-auth-user',
          email: simpleAuthEmail || 'simple-auth@example.com',
          password: 'simple-auth-password-placeholder', // 簡易認証モードでは使用しない
          name: simpleAuthName,
          role: simpleAuthRole,
        },
      });
      console.log('簡易認証モード用のユーザーを作成しました:', dbUser.id);
    }
    return dbUser.id;
  }
  return user.userId;
};

// 通知先一覧取得
router.get('/', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const actualUserId = await ensureSimpleAuthUser(user);

    // 通知先件数に上限は設けない（無制限）。take/limit は使わない。
    const recipients = await prisma.recipient.findMany({
      where: { userId: actualUserId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, recipients });
  } catch (error: any) {
    console.error('通知先一覧取得エラー:', error);
    res.status(500).json({ error: '通知先一覧の取得に失敗しました' });
  }
});

// 通知先詳細取得
router.get('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const actualUserId = await ensureSimpleAuthUser(user);

    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        userId: actualUserId,
      },
    });

    if (!recipient) {
      return res.status(404).json({ error: '通知先が見つかりません' });
    }

    res.json({ success: true, recipient });
  } catch (error: any) {
    console.error('通知先詳細取得エラー:', error);
    res.status(500).json({ error: '通知先の取得に失敗しました' });
  }
});

// 通知先作成
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: '名前とメールアドレスを入力してください' });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
    }

    // 簡易認証モードの場合、データベースにユーザーが存在するか確認し、存在しない場合は作成
    const actualUserId = await ensureSimpleAuthUser(user);

    // 同じユーザー内で重複チェック
    const existing = await prisma.recipient.findFirst({
      where: {
        userId: actualUserId,
        email,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    const recipient = await prisma.recipient.create({
      data: {
        userId: actualUserId,
        name,
        email,
      },
    });

    res.status(201).json({ success: true, recipient });
  } catch (error: any) {
    console.error('通知先作成エラー:', error);
    console.error('エラー詳細:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
    });
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'ユーザーが見つかりません' });
    }
    res.status(500).json({ error: '通知先の作成に失敗しました', details: error.message });
  }
});

// 通知先更新
router.put('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, email } = req.body;
    const actualUserId = await ensureSimpleAuthUser(user);

    if (!name || !email) {
      return res.status(400).json({ error: '名前とメールアドレスを入力してください' });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
    }

    // 通知先が存在し、ユーザーが所有しているか確認
    const existing = await prisma.recipient.findFirst({
      where: {
        id,
        userId: actualUserId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: '通知先が見つかりません' });
    }

    // 同じユーザー内で他の通知先と重複チェック
    const duplicate = await prisma.recipient.findFirst({
      where: {
        userId: actualUserId,
        email,
        id: { not: id },
      },
    });

    if (duplicate) {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }

    const recipient = await prisma.recipient.update({
      where: { id },
      data: {
        name,
        email,
      },
    });

    res.json({ success: true, recipient });
  } catch (error: any) {
    console.error('通知先更新エラー:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '通知先が見つかりません' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
    }
    res.status(500).json({ error: '通知先の更新に失敗しました' });
  }
});

// 通知先削除
router.delete('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const actualUserId = await ensureSimpleAuthUser(user);

    // 通知先が存在し、ユーザーが所有しているか確認
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        userId: actualUserId,
      },
    });

    if (!recipient) {
      return res.status(404).json({ error: '通知先が見つかりません' });
    }

    await prisma.recipient.delete({
      where: { id },
    });

    res.json({ success: true, message: '通知先を削除しました' });
  } catch (error: any) {
    console.error('通知先削除エラー:', error);
    res.status(500).json({ error: '通知先の削除に失敗しました' });
  }
});

export default router;
