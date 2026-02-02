import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// JWTトークンを生成
export const generateToken = (payload: JwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d' });
};

// JWTトークンを検証
export const verifyToken = (token: string): JwtPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.verify(token, secret) as JwtPayload;
};

// パスワードをハッシュ化
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

// パスワードを検証
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// 認証ミドルウェア
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('認証ヘッダーがありません:', req.path);
      return res.status(401).json({ error: '認証が必要です' });
    }

    const token = authHeader.substring(7);
    
    // トークンが空でないか確認
    if (!token || token.trim() === '') {
      console.warn('トークンが空です:', req.path);
      return res.status(401).json({ error: '認証が必要です' });
    }
    
    try {
      const payload = verifyToken(token);
      
      // リクエストにユーザー情報を追加
      (req as any).user = payload;
      next();
    } catch (verifyError: any) {
      // トークン検証エラーの詳細をログに記録
      console.error('トークン検証エラー:', {
        path: req.path,
        error: verifyError.message,
        errorName: verifyError.name,
        tokenPreview: token.substring(0, 20) + '...',
      });
      
      // エラーの種類に応じてメッセージを変更
      let errorMessage = '無効なトークンです';
      if (verifyError.name === 'TokenExpiredError') {
        errorMessage = 'トークンの有効期限が切れています。再度ログインしてください。';
      } else if (verifyError.name === 'JsonWebTokenError') {
        errorMessage = 'トークンの形式が正しくありません。再度ログインしてください。';
      }
      
      return res.status(401).json({ error: errorMessage });
    }
  } catch (error: any) {
    console.error('認証ミドルウェアで予期しないエラー:', error);
    return res.status(401).json({ error: '認証エラーが発生しました' });
  }
};

// オプショナル認証ミドルウェア（認証ヘッダーがある場合のみ認証を試みる）
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 認証ヘッダーがない場合は、ユーザー情報を設定せずに続行
      (req as any).user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    // トークンが空でないか確認
    if (!token || token.trim() === '') {
      (req as any).user = null;
      return next();
    }
    
    try {
      const payload = verifyToken(token);
      // リクエストにユーザー情報を追加
      (req as any).user = payload;
      next();
    } catch (verifyError: any) {
      // トークン検証に失敗した場合は、ユーザー情報を設定せずに続行
      (req as any).user = null;
      next();
    }
  } catch (error: any) {
    // エラーが発生した場合は、ユーザー情報を設定せずに続行
    (req as any).user = null;
    next();
  }
};

// 管理者権限チェック
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user as JwtPayload;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }
  next();
};
