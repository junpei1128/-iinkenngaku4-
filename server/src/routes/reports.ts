import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, optionalAuthenticate } from '../lib/auth.js';

const router = express.Router();

// 簡易認証モード用のユーザーをデータベースに作成するヘルパー関数
// 一覧・詳細・作成・更新・削除で使用するため、ルーター定義の直後に配置
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

// 認証不要の共有エンドポイント（認証ミドルウェアの前に配置）
router.get('/shared/:token', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: '共有トークンが指定されていません' });
    }

    // 共有トークンでレポートを検索
    const report = await prisma.report.findUnique({
      where: { shareToken: token },
    });

    if (!report) {
      return res.status(404).json({ error: 'レポートが見つかりません' });
    }

    // 数値フィールドの型変換と検証
    const ensureNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      if (typeof value === 'string') {
        // 文字列が 'D' などの不正な値の場合は null を返す
        if (value.trim() === '' || isNaN(parseFloat(value))) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const ensureInteger = (value: any): number | null => {
      const num = ensureNumber(value);
      return num === null ? null : Math.floor(num);
    };

    // JSON文字列をパース
    const visitedClinicStrengths = report.visitedClinicStrengths 
      ? JSON.parse(report.visitedClinicStrengths) 
      : [];
    const actionItems = report.actionItems 
      ? JSON.parse(report.actionItems) 
      : [];

    res.json({
      success: true,
      report: {
        ...report,
        visitedClinicChairCount: ensureInteger(report.visitedClinicChairCount),
        visitedClinicStaffCount: ensureInteger(report.visitedClinicStaffCount),
        visitedClinicNewPatientsPerMonth: ensureInteger(report.visitedClinicNewPatientsPerMonth),
        visitedClinicSelfPayRate: ensureNumber(report.visitedClinicSelfPayRate),
        visitedClinicRecallCount: ensureInteger(report.visitedClinicRecallCount),
        visitedClinicInsurancePointsPerMonth: ensureInteger(report.visitedClinicInsurancePointsPerMonth),
        visitedClinicStrengths,
        actionItems,
      },
    });
  } catch (error: any) {
    console.error('共有レポート取得エラー:', error);
    res.status(500).json({ error: 'レポートの取得に失敗しました' });
  }
});

// レポート一覧取得（認証不要、認証されている場合はユーザーのレポートのみ表示）
router.get('/', optionalAuthenticate, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    
    // 認証されている場合はユーザーのレポートのみ、認証されていない場合は全レポート
    let whereClause: any = {};
    let actualUserId: string | null = null;
    
    if (user) {
      try {
        actualUserId = await ensureSimpleAuthUser(user);
        whereClause = { userId: actualUserId };
        
        // デバッグログ: 一覧取得時の認証情報とフィルタ条件を記録
        console.log('=== レポート一覧取得 ===');
        console.log('認証ユーザー:', user.userId);
        console.log('actualUserId:', actualUserId);
        console.log('フィルタ条件:', whereClause);
      } catch (ensureError: any) {
        // ensureSimpleAuthUser が失敗した場合、認証ユーザーとして扱わない（空配列を返す）
        console.error('ensureSimpleAuthUser エラー:', ensureError);
        console.log('認証ユーザーの処理に失敗したため、空のリストを返します');
        whereClause = { userId: '__invalid_user__' }; // 存在しないユーザーIDでフィルタして空配列を返す
        actualUserId = null;
      }
    } else {
      console.log('=== レポート一覧取得（認証なし） ===');
      console.log('認証されていないため、全レポートを取得');
    }
    
    const reports = await prisma.report.findMany({
      where: whereClause,
      orderBy: { visitDate: 'desc' },
    });
    
    // デバッグログ: 取得件数を記録
    console.log('取得レポート件数:', reports.length);
    if (reports.length > 0 && actualUserId) {
      console.log('最初のレポートID:', reports[0].id, 'userId:', reports[0].userId);
    }
    console.log('========================');

    // 数値フィールドの型変換と検証
    const ensureNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      if (typeof value === 'string') {
        // 文字列が 'D' などの不正な値の場合は null を返す
        if (value.trim() === '' || isNaN(parseFloat(value))) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const ensureInteger = (value: any): number | null => {
      const num = ensureNumber(value);
      return num === null ? null : Math.floor(num);
    };

    // JSON文字列をパースして返す（エラーハンドリング付き）
    const parsedReports = reports.map(report => {
      let visitedClinicStrengths: string[] = [];
      let actionItems: any[] = [];
      try {
        visitedClinicStrengths = report.visitedClinicStrengths 
          ? JSON.parse(report.visitedClinicStrengths) 
          : [];
      } catch (error) {
        console.error(`レポートID ${report.id} のvisitedClinicStrengthsパースエラー:`, error);
        visitedClinicStrengths = [];
      }
      try {
        actionItems = report.actionItems 
          ? JSON.parse(report.actionItems) 
          : [];
      } catch (error) {
        console.error(`レポートID ${report.id} のactionItemsパースエラー:`, error);
        actionItems = [];
      }
      return {
        ...report,
        visitedClinicChairCount: ensureInteger(report.visitedClinicChairCount),
        visitedClinicStaffCount: ensureInteger(report.visitedClinicStaffCount),
        visitedClinicNewPatientsPerMonth: ensureInteger(report.visitedClinicNewPatientsPerMonth),
        visitedClinicSelfPayRate: ensureNumber(report.visitedClinicSelfPayRate),
        visitedClinicRecallCount: ensureInteger(report.visitedClinicRecallCount),
        visitedClinicInsurancePointsPerMonth: ensureInteger(report.visitedClinicInsurancePointsPerMonth),
        visitedClinicStrengths,
        actionItems,
      };
    });

    res.json({ success: true, reports: parsedReports });
  } catch (error: any) {
    console.error('レポート一覧取得エラー:', error);
    res.status(500).json({ error: 'レポート一覧の取得に失敗しました' });
  }
});

// レポート詳細取得（認証不要、認証されている場合はユーザーのレポートのみ表示）
router.get('/:id', optionalAuthenticate, async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // 認証されている場合はユーザーのレポートのみ、認証されていない場合は全レポート
    let whereClause: any = { id };
    if (user) {
      const actualUserId = await ensureSimpleAuthUser(user);
      whereClause = { id, userId: actualUserId };
    }

    const report = await prisma.report.findFirst({
      where: whereClause,
    });

    if (!report) {
      return res.status(404).json({ error: 'レポートが見つかりません' });
    }

    // 数値フィールドの型変換と検証
    const ensureNumber = (value: any): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      if (typeof value === 'string') {
        // 文字列が 'D' などの不正な値の場合は null を返す
        if (value.trim() === '' || isNaN(parseFloat(value))) return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const ensureInteger = (value: any): number | null => {
      const num = ensureNumber(value);
      return num === null ? null : Math.floor(num);
    };

    // JSON文字列をパース（エラーハンドリング付き）
    let visitedClinicStrengths: string[] = [];
    let actionItems: any[] = [];
    try {
      visitedClinicStrengths = report.visitedClinicStrengths 
        ? JSON.parse(report.visitedClinicStrengths) 
        : [];
    } catch (error) {
      console.error('visitedClinicStrengthsのパースエラー:', error);
      visitedClinicStrengths = [];
    }
    try {
      actionItems = report.actionItems 
        ? JSON.parse(report.actionItems) 
        : [];
    } catch (error) {
      console.error('actionItemsのパースエラー:', error);
      actionItems = [];
    }

    res.json({
      success: true,
      report: {
        ...report,
        visitedClinicChairCount: ensureInteger(report.visitedClinicChairCount),
        visitedClinicStaffCount: ensureInteger(report.visitedClinicStaffCount),
        visitedClinicNewPatientsPerMonth: ensureInteger(report.visitedClinicNewPatientsPerMonth),
        visitedClinicSelfPayRate: ensureNumber(report.visitedClinicSelfPayRate),
        visitedClinicRecallCount: ensureInteger(report.visitedClinicRecallCount),
        visitedClinicInsurancePointsPerMonth: ensureInteger(report.visitedClinicInsurancePointsPerMonth),
        visitedClinicStrengths,
        actionItems,
      },
    });
  } catch (error: any) {
    console.error('レポート詳細取得エラー:', error);
    res.status(500).json({ error: 'レポートの取得に失敗しました' });
  }
});

// 以降のエンドポイント（作成・更新・削除）は認証が必要
router.use(authenticate);

// レポート作成
router.post('/', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const reportData = req.body;

    // 必須フィールドのバリデーション
    if (!reportData.visitDate || !reportData.clinicName || !reportData.prefecture || !reportData.city) {
      return res.status(400).json({ error: '必須項目が不足しています' });
    }

    // JSON配列を文字列に変換
    const visitedClinicStrengths = Array.isArray(reportData.visitedClinicStrengths)
      ? JSON.stringify(reportData.visitedClinicStrengths)
      : '[]';
    const actionItems = Array.isArray(reportData.actionItems)
      ? JSON.stringify(reportData.actionItems)
      : '[]';

    // 数値フィールドの型変換と検証
    const parseNumber = (value: any): number | null => {
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const parseInteger = (value: any): number | null => {
      const num = parseNumber(value);
      return num === null ? null : Math.floor(num);
    };

    // 簡易認証モードの場合、データベースにユーザーが存在するか確認し、存在しない場合は作成
    const actualUserId = await ensureSimpleAuthUser(user);

    const report = await prisma.report.create({
      data: {
        userId: actualUserId,
        visitDate: reportData.visitDate,
        clinicName: reportData.clinicName,
        prefecture: reportData.prefecture,
        city: reportData.city,
        visitedClinicWebsiteUrl: reportData.visitedClinicWebsiteUrl || null,
        visitedClinicChairCount: parseInteger(reportData.visitedClinicChairCount),
        visitedClinicStaffCount: parseInteger(reportData.visitedClinicStaffCount),
        visitedClinicNewPatientsPerMonth: parseInteger(reportData.visitedClinicNewPatientsPerMonth),
        visitedClinicSelfPayRate: parseNumber(reportData.visitedClinicSelfPayRate),
        visitedClinicRecallCount: parseInteger(reportData.visitedClinicRecallCount),
        visitedClinicInsurancePointsPerMonth: parseInteger(reportData.visitedClinicInsurancePointsPerMonth),
        visitedClinicStrengths,
        myClinicName: reportData.myClinicName || null,
        myClinicWebsiteUrl: reportData.myClinicWebsiteUrl || null,
        impressivePoints: reportData.impressivePoints || '',
        actionItems,
        pdfData: reportData.pdfData || null,
        shareToken: reportData.shareToken || null,
        isCompleted: reportData.isCompleted || false,
        version: 1,
      },
    });

    // JSON文字列をパースして返す（エラーハンドリング付き）
    let visitedClinicStrengthsParsed: string[] = [];
    let actionItemsParsed: any[] = [];
    try {
      visitedClinicStrengthsParsed = report.visitedClinicStrengths 
        ? JSON.parse(report.visitedClinicStrengths) 
        : [];
    } catch (error) {
      console.error('visitedClinicStrengthsのパースエラー:', error);
      visitedClinicStrengthsParsed = [];
    }
    try {
      actionItemsParsed = report.actionItems 
        ? JSON.parse(report.actionItems) 
        : [];
    } catch (error) {
      console.error('actionItemsのパースエラー:', error);
      actionItemsParsed = [];
    }

    res.status(201).json({
      success: true,
      report: {
        ...report,
        visitedClinicStrengths: visitedClinicStrengthsParsed,
        actionItems: actionItemsParsed,
      },
    });
  } catch (error: any) {
    console.error('レポート作成エラー:', error);
    console.error('エラー詳細:', {
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack,
    });
    
    // データベーススキーマエラーの場合
    if (error.message?.includes('does not exist') || error.message?.includes('no such column') || error.message?.includes('shareToken')) {
      return res.status(500).json({ 
        error: 'データベーススキーマが最新ではありません。マイグレーションを実行してください。',
        details: error.message 
      });
    }
    
    // より詳細なエラーメッセージを返す
    let errorMessage = 'レポートの作成に失敗しました';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code === 'P2002') {
      errorMessage = 'レポートの作成に失敗しました（重複エラー）';
    } else if (error.code === 'P2003') {
      errorMessage = 'レポートの作成に失敗しました（外部キー制約エラー）';
    }
    
    res.status(500).json({ error: errorMessage, details: error.message });
  }
});

// レポート更新（楽観的ロック付き）
router.put('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const reportData = req.body;
    const expectedVersion = reportData.version;

    if (expectedVersion === undefined) {
      return res.status(400).json({ error: 'バージョン情報が必要です' });
    }

    // 簡易認証モードの場合、データベースにユーザーが存在するか確認し、存在しない場合は作成
    const actualUserId = await ensureSimpleAuthUser(user);

    // 現在のレポートを取得
    const currentReport = await prisma.report.findFirst({
      where: {
        id,
        userId: actualUserId,
      },
    });

    if (!currentReport) {
      return res.status(404).json({ error: 'レポートが見つかりません' });
    }

    // 楽観的ロック: バージョンチェック
    if (currentReport.version !== expectedVersion) {
      return res.status(409).json({
        error: '他のユーザーが編集しています',
        message: 'レポートが他のユーザーによって更新されました。最新のデータを再読み込みしてください。',
        currentVersion: currentReport.version,
        expectedVersion,
      });
    }

    // JSON配列を文字列に変換
    const visitedClinicStrengths = Array.isArray(reportData.visitedClinicStrengths)
      ? JSON.stringify(reportData.visitedClinicStrengths)
      : reportData.visitedClinicStrengths || '[]';
    const actionItems = Array.isArray(reportData.actionItems)
      ? JSON.stringify(reportData.actionItems)
      : reportData.actionItems || '[]';

    // 数値フィールドの型変換と検証
    const parseNumber = (value: any): number | null => {
      if (value === undefined || value === null || value === '') return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      }
      return null;
    };

    const parseInteger = (value: any): number | null => {
      const num = parseNumber(value);
      return num === null ? null : Math.floor(num);
    };

    // レポートを更新（バージョンをインクリメント）
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        visitDate: reportData.visitDate,
        clinicName: reportData.clinicName,
        prefecture: reportData.prefecture,
        city: reportData.city,
        visitedClinicWebsiteUrl: reportData.visitedClinicWebsiteUrl || null,
        visitedClinicChairCount: parseInteger(reportData.visitedClinicChairCount),
        visitedClinicStaffCount: parseInteger(reportData.visitedClinicStaffCount),
        visitedClinicNewPatientsPerMonth: parseInteger(reportData.visitedClinicNewPatientsPerMonth),
        visitedClinicSelfPayRate: parseNumber(reportData.visitedClinicSelfPayRate),
        visitedClinicRecallCount: parseInteger(reportData.visitedClinicRecallCount),
        visitedClinicInsurancePointsPerMonth: parseInteger(reportData.visitedClinicInsurancePointsPerMonth),
        visitedClinicStrengths,
        myClinicName: reportData.myClinicName || null,
        myClinicWebsiteUrl: reportData.myClinicWebsiteUrl || null,
        impressivePoints: reportData.impressivePoints || '',
        actionItems,
        pdfData: reportData.pdfData !== undefined ? reportData.pdfData : currentReport.pdfData,
        shareToken: reportData.shareToken !== undefined ? reportData.shareToken : currentReport.shareToken,
        isCompleted: reportData.isCompleted !== undefined ? reportData.isCompleted : currentReport.isCompleted,
        version: currentReport.version + 1,
      },
    });

    // JSON文字列をパースして返す（エラーハンドリング付き）
    let visitedClinicStrengthsParsed: string[] = [];
    let actionItemsParsed: any[] = [];
    try {
      visitedClinicStrengthsParsed = updatedReport.visitedClinicStrengths 
        ? JSON.parse(updatedReport.visitedClinicStrengths) 
        : [];
    } catch (error) {
      console.error('visitedClinicStrengthsのパースエラー:', error);
      visitedClinicStrengthsParsed = [];
    }
    try {
      actionItemsParsed = updatedReport.actionItems 
        ? JSON.parse(updatedReport.actionItems) 
        : [];
    } catch (error) {
      console.error('actionItemsのパースエラー:', error);
      actionItemsParsed = [];
    }

    res.json({
      success: true,
      report: {
        ...updatedReport,
        visitedClinicStrengths: visitedClinicStrengthsParsed,
        actionItems: actionItemsParsed,
      },
    });
  } catch (error: any) {
    console.error('レポート更新エラー:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'レポートが見つかりません' });
    }
    // ボディサイズ超過などはグローバルハンドラで処理されるため、ここでは汎用メッセージ
    res.status(500).json({
      error: 'レポートの更新に失敗しました',
      message: error.message || '不明なエラー',
    });
  }
});

// レポート削除
router.delete('/:id', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const actualUserId = await ensureSimpleAuthUser(user);

    // レポートが存在し、ユーザーが所有しているか確認
    const report = await prisma.report.findFirst({
      where: {
        id,
        userId: actualUserId,
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'レポートが見つかりません' });
    }

    await prisma.report.delete({
      where: { id },
    });

    res.json({ success: true, message: 'レポートを削除しました' });
  } catch (error: any) {
    console.error('レポート削除エラー:', error);
    res.status(500).json({ error: 'レポートの削除に失敗しました' });
  }
});

export default router;
