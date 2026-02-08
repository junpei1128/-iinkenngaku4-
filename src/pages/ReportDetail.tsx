import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PhotoUpload } from '../components/PhotoUpload';
import { reportApi, recipientApi } from '../utils/api';
import { sendReportNotification } from '../utils/email';
import { generateReportPDF } from '../utils/pdf';
import type { Report, ActionItem, Recipient } from '../types';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const CLINIC_STRENGTHS = [
  '自費率',
  'リコール率・人数',
  '新規患者数',
  '中断・キャンセル率',
  '生産性・診療効率',
  '採用・教育'
];

export const ReportDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new';

  const [formData, setFormData] = useState<Omit<Report, 'id' | 'createdAt'>>({
    visitDate: new Date().toISOString().split('T')[0],
    clinicName: '',
    prefecture: '',
    city: '',
    visitedClinicWebsiteUrl: '',
    visitedClinicChairCount: undefined,
    visitedClinicStaffCount: undefined,
    visitedClinicNewPatientsPerMonth: undefined,
    visitedClinicSelfPayRate: undefined,
    visitedClinicRecallCount: undefined,
    visitedClinicInsurancePointsPerMonth: undefined,
    visitedClinicStrengths: [],
    myClinicName: '',
    myClinicWebsiteUrl: '',
    impressivePoints: '',
    actionItems: [],
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  /** 画面を塞がないエラー表示用（スマホで入力内容が見えるように） */
  const [pageError, setPageError] = useState<string | null>(null);

  // フォームデータを更新するヘルパー関数
  const updateFormDataFromReport = (report: Report) => {
    setFormData({
      visitDate: report.visitDate,
      clinicName: report.clinicName,
      prefecture: report.prefecture,
      city: report.city,
      visitedClinicWebsiteUrl: report.visitedClinicWebsiteUrl || '',
      // nullの場合はundefinedに変換（フロントエンドの型定義に合わせる）
      visitedClinicChairCount: report.visitedClinicChairCount ?? undefined,
      visitedClinicStaffCount: report.visitedClinicStaffCount ?? undefined,
      visitedClinicNewPatientsPerMonth: report.visitedClinicNewPatientsPerMonth ?? undefined,
      visitedClinicSelfPayRate: report.visitedClinicSelfPayRate ?? undefined,
      visitedClinicRecallCount: report.visitedClinicRecallCount ?? undefined,
      visitedClinicInsurancePointsPerMonth: report.visitedClinicInsurancePointsPerMonth ?? undefined,
      visitedClinicStrengths: report.visitedClinicStrengths || [],
      myClinicName: report.myClinicName || '',
      myClinicWebsiteUrl: report.myClinicWebsiteUrl || '',
      impressivePoints: report.impressivePoints,
      actionItems: report.actionItems,
    });
    setIsCompleted(report.isCompleted || false);
    // バージョン情報を更新
    (window as any).__currentReportVersion = report.version ?? 1;
  };

  useEffect(() => {
    const loadReport = async () => {
      if (isEdit && id) {
        try {
          const report = await reportApi.getById(id);
          updateFormDataFromReport(report);
        } catch (error: any) {
          console.error('レポート読み込みエラー:', error);
          const errorMessage = error.message || 'レポートの読み込みに失敗しました';
          
          // 認証エラーの場合はログインページにリダイレクト
          if (errorMessage.includes('認証') || 
              errorMessage.includes('無効なトークン') || 
              errorMessage.includes('トークン') ||
              errorMessage.includes('401')) {
            navigate('/login', { replace: true });
            return;
          }
          // alert ではなくバナー表示（スマホでフォームが隠れないように）
          setPageError(`レポートの読み込みに失敗しました。${errorMessage}`);
        }
      }
    };
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const saveReportData = async (setCompleted: boolean = false): Promise<Report | null> => {
    // バックエンド接続を確認（シンプルな方法）
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    try {
      const healthCheck = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2秒でタイムアウト
      });
      if (!healthCheck.ok) {
        throw new Error('バックエンドサーバーが応答しません');
      }
    } catch (healthError: any) {
      console.error('バックエンド接続チェック失敗:', healthError);
      const isProduction = import.meta.env.PROD && API_BASE_URL.includes('onrender.com');
      const msg = isProduction
        ? 'サーバーに接続できません。無料プランでは一定時間でスリープします。30秒ほど待ってから「再読み込み」してください。'
        : `バックエンドサーバーに接続できません。確認: 1) サーバー起動 2) ${API_BASE_URL}/health にアクセス`;
      setPageError(msg);
      return null;
    }
    
    // バリデーション
    const newErrors: Partial<Record<string, string>> = {};
    if (!formData.visitDate) {
      newErrors.visitDate = '見学日を入力してください';
    }
    if (!formData.clinicName.trim()) {
      newErrors.clinicName = '見学先医院名を入力してください';
    }
    if (!formData.prefecture) {
      newErrors.prefecture = '都道府県を入力してください';
    }
    if (!formData.city.trim()) {
      newErrors.city = '市を入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }

    try {
      let report: Report;
      
      // undefinedをnullに変換するヘルパー関数（バックエンドの期待する形式に合わせる）
      const convertUndefinedToNull = <T,>(value: T | undefined): T | null => {
        return value === undefined ? null : value;
      };
      
      if (isEdit && id) {
        // 既存レポートを更新
        const currentVersion = (window as any).__currentReportVersion ?? 1;
        if (!currentVersion || currentVersion < 1) {
          throw new Error('バージョン情報が不正です。ページを再読み込みしてください。');
        }
        const reportData = {
          ...formData,
          // undefinedの値をnullに変換（バックエンドの期待する形式に合わせる）
          visitedClinicWebsiteUrl: formData.visitedClinicWebsiteUrl || null,
          visitedClinicChairCount: convertUndefinedToNull(formData.visitedClinicChairCount) as any,
          visitedClinicStaffCount: convertUndefinedToNull(formData.visitedClinicStaffCount) as any,
          visitedClinicNewPatientsPerMonth: convertUndefinedToNull(formData.visitedClinicNewPatientsPerMonth) as any,
          visitedClinicSelfPayRate: convertUndefinedToNull(formData.visitedClinicSelfPayRate) as any,
          visitedClinicRecallCount: convertUndefinedToNull(formData.visitedClinicRecallCount) as any,
          visitedClinicInsurancePointsPerMonth: convertUndefinedToNull(formData.visitedClinicInsurancePointsPerMonth) as any,
          visitedClinicStrengths: formData.visitedClinicStrengths || [],
          myClinicName: formData.myClinicName || null,
          myClinicWebsiteUrl: formData.myClinicWebsiteUrl || null,
          impressivePoints: formData.impressivePoints || '',
          actionItems: normalizeActionItemsForSave(formData.actionItems || []),
          version: currentVersion,
          isCompleted: setCompleted ? true : formData.isCompleted,
        } as Partial<Report> & { version: number };
        
        console.log('保存するデータ:', {
          id,
          version: currentVersion,
          isCompleted: reportData.isCompleted,
          clinicName: reportData.clinicName,
          visitDate: reportData.visitDate,
        });
        
        report = await reportApi.update(id, reportData);
        console.log('保存されたデータ:', {
          id: report.id,
          version: report.version,
          isCompleted: report.isCompleted,
          clinicName: report.clinicName,
          visitDate: report.visitDate,
        });
        
        // 保存後、サーバーから最新データを取得して確認
        try {
          const verifiedReport = await reportApi.getById(id);
          updateFormDataFromReport(verifiedReport);
          report = verifiedReport; // 検証済みデータを使用
          console.log('保存後のデータ確認完了:', verifiedReport.id);
        } catch (error: any) {
          console.warn('保存後のデータ確認に失敗:', error);
          // エラーが発生しても、updateの結果を使用
          updateFormDataFromReport(report);
        }
      } else {
        // 新規レポートを作成
        const reportData = {
          ...formData,
          // undefinedの値をnullに変換（バックエンドの期待する形式に合わせる）
          visitedClinicWebsiteUrl: formData.visitedClinicWebsiteUrl || null,
          visitedClinicChairCount: convertUndefinedToNull(formData.visitedClinicChairCount) as any,
          visitedClinicStaffCount: convertUndefinedToNull(formData.visitedClinicStaffCount) as any,
          visitedClinicNewPatientsPerMonth: convertUndefinedToNull(formData.visitedClinicNewPatientsPerMonth) as any,
          visitedClinicSelfPayRate: convertUndefinedToNull(formData.visitedClinicSelfPayRate) as any,
          visitedClinicRecallCount: convertUndefinedToNull(formData.visitedClinicRecallCount) as any,
          visitedClinicInsurancePointsPerMonth: convertUndefinedToNull(formData.visitedClinicInsurancePointsPerMonth) as any,
          visitedClinicStrengths: formData.visitedClinicStrengths || [],
          myClinicName: formData.myClinicName || null,
          myClinicWebsiteUrl: formData.myClinicWebsiteUrl || null,
          impressivePoints: formData.impressivePoints || '',
          actionItems: normalizeActionItemsForSave(formData.actionItems || []),
          isCompleted: setCompleted ? true : false,
        } as Omit<Report, 'id' | 'createdAt' | 'version'>;
        
        console.log('新規レポートを作成:', {
          isCompleted: reportData.isCompleted,
          clinicName: reportData.clinicName,
          visitDate: reportData.visitDate,
        });
        
        report = await reportApi.create(reportData);
        console.log('レポートを作成しました:', {
          id: report.id,
          version: report.version,
          isCompleted: report.isCompleted,
          clinicName: report.clinicName,
          visitDate: report.visitDate,
        });
        
        // 保存後、サーバーから最新データを取得して確認
        try {
          const verifiedReport = await reportApi.getById(report.id);
          updateFormDataFromReport(verifiedReport);
          report = verifiedReport; // 検証済みデータを使用
          console.log('作成後のデータ確認完了:', verifiedReport.id);
        } catch (error: any) {
          console.warn('作成後のデータ確認に失敗:', error);
          // エラーが発生しても、createの結果を使用
          updateFormDataFromReport(report);
        }
        
        navigate(`/reports/${report.id}`, { replace: true });
      }
      
      if (setCompleted) {
        setIsCompleted(true);
      }
      
      return report;
    } catch (error: any) {
      console.error('レポート保存エラー:', error);
      const errorMessage = error.message || 'レポートの保存に失敗しました';
      
      // 認証エラーの場合はログインページにリダイレクト
      if (errorMessage.includes('認証') || 
          errorMessage.includes('無効なトークン') || 
          errorMessage.includes('トークン') ||
          errorMessage.includes('401') ||
          errorMessage.includes('認証が必要')) {
        alert('ログインが必要です。ログインページに移動します。');
        navigate('/login', { replace: true });
        return null;
      }
      
      // 競合エラー（409 Conflict）の処理
      if (errorMessage.includes('他のユーザーが編集') || errorMessage.includes('409')) {
        const shouldReload = window.confirm(
          '他のユーザーがこのレポートを編集しています。最新のデータを読み込みますか？'
        );
        if (shouldReload) {
          // ページを再読み込み
          window.location.reload();
        }
        return null;
      }
      
      const isProduction = import.meta.env.PROD && (errorMessage.includes('onrender.com') || errorMessage.includes('サーバーに接続できません'));
      const displayMsg = isProduction
        ? 'レポートの保存に失敗しました。サーバーがスリープ中の可能性があります。しばらく待ってから再度お試しください。'
        : `レポートの保存に失敗しました。${errorMessage}`;
      setPageError(displayMsg);
      return null;
    }
  };

  const handleTemporarySave = async (e: React.MouseEvent) => {
    e.preventDefault();
    const savedReport = await saveReportData();
    if (savedReport) {
      alert('一時保存しました');
      // 編集画面に留まる（何もしない）
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ステップ1: 現在のフォームデータを確実に保存（isCompleted=true）
    let savedReport = await saveReportData(true);
    if (!savedReport) {
      // バリデーションエラーがある場合は既にエラーが表示されている
      return;
    }

    // ステップ2: 保存されたレポートの最新データを取得（確実に反映）
    try {
      console.log('ステップ2: 保存後の最新データを取得');
      savedReport = await reportApi.getById(savedReport.id);
      updateFormDataFromReport(savedReport);
      console.log('最新データを取得しました:', savedReport.id);
    } catch (error: any) {
      console.error('最新データの取得に失敗:', error);
      // エラーが発生しても続行
    }

    // ステップ3: 共有トークンを追加（必要に応じて）
    let shareToken = savedReport.shareToken;
    if (!shareToken) {
      // UUID v4を生成
      shareToken = crypto.randomUUID();
      // 共有トークンを保存（全データを含めて更新）
      try {
        if (!savedReport.version || savedReport.version < 1) {
          throw new Error('バージョン情報が不正です。');
        }
        console.log('ステップ3: 共有トークンを保存（全データを含める）');
        const updatedReport = await reportApi.update(savedReport.id, {
          ...savedReport, // 既存のデータをすべて含める
          shareToken,
          version: savedReport.version,
          isCompleted: true, // 確実に完了状態にする
        });
        savedReport = updatedReport;
        updateFormDataFromReport(updatedReport);
        console.log('共有トークンを保存しました');
        
        // 更新後、サーバーから最新データを取得
        try {
          savedReport = await reportApi.getById(savedReport.id);
          updateFormDataFromReport(savedReport);
        } catch (error: any) {
          console.error('共有トークン保存後のデータ取得に失敗:', error);
        }
      } catch (error: any) {
        console.error('共有トークン保存エラー:', error);
        // エラーが発生しても続行
      }
    }

    // ステップ4: PDFを生成・保存
    let pdfData: string | undefined;
    try {
      console.log('ステップ4: PDFを生成');
      pdfData = await generateReportPDF(savedReport);
      console.log('PDF生成完了');
      
      // 生成したPDFをレポートに保存（全データを含めて更新）
      try {
        if (!savedReport.version || savedReport.version < 1) {
          throw new Error('バージョン情報が不正です。');
        }
        console.log('ステップ4: PDFを保存（全データを含める）');
        const updatedReport = await reportApi.update(savedReport.id, {
          ...savedReport, // 既存のデータをすべて含める
          pdfData,
          version: savedReport.version,
          isCompleted: true, // 確実に完了状態にする
        });
        savedReport = updatedReport;
        updateFormDataFromReport(updatedReport);
        console.log('PDFを保存しました');
        
        // 更新後、サーバーから最新データを取得
        try {
          savedReport = await reportApi.getById(savedReport.id);
          updateFormDataFromReport(savedReport);
        } catch (error: any) {
          console.error('PDF保存後のデータ取得に失敗:', error);
        }
      } catch (error: any) {
        console.error('PDF保存エラー:', error);
        // エラーが発生しても続行
      }
    } catch (error: any) {
      console.error('PDF生成エラー:', error);
      // PDF生成に失敗してもメール送信は続行
    }

    // レポート完了を先に通知
    alert('レポート完了しました');

    // 通知先を取得
    let recipients: Recipient[] = [];
    try {
      recipients = await recipientApi.getAll();
    } catch (error: any) {
      console.error('通知先取得エラー:', error);
      recipients = [];
    }

    // メール送信（通知先が存在する場合のみ）
    if (recipients.length > 0) {
      try {
        const appUrl = window.location.origin;
        const result = await sendReportNotification(
          recipients,
          savedReport,
          appUrl,
          pdfData,
          shareToken
        );

        if (result.success && (!result.failedCount || result.failedCount === 0)) {
          alert(`メール送信完了しました\n\n${result.message}`);
        } else {
          let message = 'メール送信完了しました';
          if (!result.success || (result.failedCount && result.failedCount > 0 && (!result.sentCount || result.sentCount === 0))) {
            message = 'メール送信に失敗しました';
            if (result.message && !result.message.includes('サーバーエラー')) {
              message += `\n\n${result.message}`;
            }
          } else {
            message += `\n\n${result.message || '一部送信に失敗しました。'}`;
          }
          if (result.invalidRecipients && result.invalidRecipients.length > 0) {
            message += `\n\n無効なメールアドレス:\n${result.invalidRecipients.map(r => `  - ${r.email} (${r.name}): ${r.reason}`).join('\n')}`;
          }
          if (result.failed && result.failed.length > 0) {
            message += `\n\n送信に失敗したメールアドレス:\n${result.failed.map(r => `  - ${r.email} (${r.name}): ${r.reason}`).join('\n')}`;
          }
          if (result.successful && result.successful.length > 0 && result.failedCount && result.failedCount > 0) {
            message += `\n\n送信に成功したメールアドレス:\n${result.successful.map(r => `  - ${r.email} (${r.name})`).join('\n')}`;
          }
          if (result.error && result.error.includes('サーバーエラー')) {
            message += `\n\nエラー: ${result.error}`;
            if (result.details) message += `\n詳細: ${result.details}`;
          } else {
            if (result.details) message += `\n詳細: ${result.details}`;
            if (result.error?.includes('EAUTH')) message += '\n原因: Gmail認証エラー - アプリパスワードを確認してください';
          }
          alert(message);
          console.error('メール送信エラー詳細:', result);
        }
      } catch (error: any) {
        console.error('メール送信エラー:', error);
        const errorMessage = error?.message || error?.error || 'メール送信に失敗しました';
        alert(`メール送信に失敗しました\n\nエラー: ${errorMessage}`);
      }
    }
    
    // ステップ5: 最終確認 - サーバーから最新データを取得
    try {
      console.log('ステップ5: 最終確認 - 最新データを取得');
      const finalReport = await reportApi.getById(savedReport.id);
      updateFormDataFromReport(finalReport);
      savedReport = finalReport;
      console.log('最終データを取得しました:', finalReport.id);
    } catch (error: any) {
      console.error('最終データの取得に失敗:', error);
      // エラーが発生しても続行
    }
    
    // ステップ6: レポート一覧に移動
    navigate('/reports');
  };

  const addActionItem = () => {
    const newItem: ActionItem = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      photos: [],
    };
    setFormData(prev => ({
      ...prev,
      actionItems: [...prev.actionItems, newItem],
    }));
  };

  const updateActionItem = (itemId: string, field: keyof ActionItem, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  /** 項目ごとの写真配列（旧 photo も配列に正規化） */
  const getItemPhotos = (item: ActionItem): string[] =>
    item.photos ?? (item.photo ? [item.photo] : []);

  /** 保存用に actionItems を正規化（photos 配列に統一） */
  const normalizeActionItemsForSave = (items: ActionItem[]): ActionItem[] =>
    (items || []).map(item => {
      const photos = getItemPhotos(item);
      const { photo: _photo, ...rest } = item;
      return { ...rest, photos };
    });

  const removeActionItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      actionItems: prev.actionItems.filter(item => item.id !== itemId),
    }));
  };

  const handleStrengthToggle = (strength: string) => {
    setFormData(prev => {
      const currentStrengths = prev.visitedClinicStrengths || [];
      const isSelected = currentStrengths.includes(strength);
      return {
        ...prev,
        visitedClinicStrengths: isSelected
          ? currentStrengths.filter(s => s !== strength)
          : [...currentStrengths, strength],
      };
    });
  };


  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0 min-w-0">
        <div className="max-w-4xl mx-auto min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {isCompleted ? 'レポート閲覧' : (isEdit ? 'レポート編集' : 'レポート作成')}
          </h2>

          {pageError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-red-800 text-sm flex-1">{pageError}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                >
                  一覧に戻る
                </button>
                <button
                  type="button"
                  onClick={() => setPageError(null)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                  aria-label="閉じる"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
              <p className="font-bold">このレポートは完了済みのため編集できません</p>
            </div>
          )}

          <form
            onSubmit={handleComplete}
            onFocus={(e) => {
              const el = e.target as HTMLElement;
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            }}
            className="bg-white shadow-md rounded-lg px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 mb-4"
          >
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitDate">
                見学日 <span className="text-red-500">*</span>
              </label>
              <input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                disabled={isCompleted}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  errors.visitDate ? 'border-red-500' : ''
                } ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {errors.visitDate && <p className="text-red-500 text-xs mt-1">{errors.visitDate}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="clinicName">
                見学先医院名 <span className="text-red-500">*</span>
              </label>
              <input
                id="clinicName"
                type="text"
                value={formData.clinicName}
                onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
                disabled={isCompleted}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  errors.clinicName ? 'border-red-500' : ''
                } ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="見学先医院名を入力"
              />
              {errors.clinicName && <p className="text-red-500 text-xs mt-1">{errors.clinicName}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="prefecture">
                都道府県 <span className="text-red-500">*</span>
              </label>
              <select
                id="prefecture"
                value={formData.prefecture}
                onChange={(e) => setFormData(prev => ({ ...prev, prefecture: e.target.value }))}
                disabled={isCompleted}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  errors.prefecture ? 'border-red-500' : ''
                } ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">選択してください</option>
                {PREFECTURES.map(pref => (
                  <option key={pref} value={pref}>{pref}</option>
                ))}
              </select>
              {errors.prefecture && <p className="text-red-500 text-xs mt-1">{errors.prefecture}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                市 <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                disabled={isCompleted}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                  errors.city ? 'border-red-500' : ''
                } ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="市を入力"
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            {/* 医院見学先のHP */}
            <div className="mb-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">医院見学先のHP</h3>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicWebsiteUrl">
                  HPのURL
                </label>
                <input
                  id="visitedClinicWebsiteUrl"
                  type="url"
                  value={formData.visitedClinicWebsiteUrl || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, visitedClinicWebsiteUrl: e.target.value }))}
                  disabled={isCompleted}
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            {/* 医院見学先の情報 */}
            <div className="mb-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">医院見学先の情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicChairCount">
                    チェア台数
                  </label>
                  <input
                    id="visitedClinicChairCount"
                    type="number"
                    min="0"
                    value={formData.visitedClinicChairCount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicChairCount: value === '' ? undefined : (isNaN(parseInt(value)) ? undefined : parseInt(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicStaffCount">
                    スタッフ人数
                  </label>
                  <input
                    id="visitedClinicStaffCount"
                    type="number"
                    min="0"
                    value={formData.visitedClinicStaffCount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicStaffCount: value === '' ? undefined : (isNaN(parseInt(value)) ? undefined : parseInt(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicNewPatientsPerMonth">
                    新規患者数/月
                  </label>
                  <input
                    id="visitedClinicNewPatientsPerMonth"
                    type="number"
                    min="0"
                    value={formData.visitedClinicNewPatientsPerMonth ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicNewPatientsPerMonth: value === '' ? undefined : (isNaN(parseInt(value)) ? undefined : parseInt(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicSelfPayRate">
                    自費率（%）
                  </label>
                  <input
                    id="visitedClinicSelfPayRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.visitedClinicSelfPayRate ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicSelfPayRate: value === '' ? undefined : (isNaN(parseFloat(value)) ? undefined : parseFloat(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicRecallCount">
                    リコール人数
                  </label>
                  <input
                    id="visitedClinicRecallCount"
                    type="number"
                    min="0"
                    value={formData.visitedClinicRecallCount ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicRecallCount: value === '' ? undefined : (isNaN(parseInt(value)) ? undefined : parseInt(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="visitedClinicInsurancePointsPerMonth">
                    保険金額 円
                  </label>
                  <input
                    id="visitedClinicInsurancePointsPerMonth"
                    type="number"
                    min="0"
                    value={formData.visitedClinicInsurancePointsPerMonth ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        visitedClinicInsurancePointsPerMonth: value === '' ? undefined : (isNaN(parseInt(value)) ? undefined : parseInt(value))
                      }));
                    }}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* 医院見学先の強み */}
            <div className="mb-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">医院見学先の強み（複数選択可）</h3>
              <div className="space-y-2">
                {CLINIC_STRENGTHS.map((strength) => (
                  <label key={strength} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.visitedClinicStrengths || []).includes(strength)}
                      onChange={() => handleStrengthToggle(strength)}
                      disabled={isCompleted}
                      className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${isCompleted ? 'cursor-not-allowed opacity-50' : ''}`}
                    />
                    <span className="text-gray-700">{strength}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* あなたの医院情報 */}
            <div className="mb-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">あなたの医院情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="myClinicName">
                    医院名
                  </label>
                  <input
                    id="myClinicName"
                    type="text"
                    value={formData.myClinicName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, myClinicName: e.target.value }))}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="医院名を入力"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="myClinicWebsiteUrl">
                    HPのURL
                  </label>
                  <input
                    id="myClinicWebsiteUrl"
                    type="url"
                    value={formData.myClinicWebsiteUrl || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, myClinicWebsiteUrl: e.target.value }))}
                    disabled={isCompleted}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="impressivePoints">
                見学して「すごい」と思ったこと
              </label>
              <textarea
                id="impressivePoints"
                value={formData.impressivePoints}
                onChange={(e) => setFormData(prev => ({ ...prev, impressivePoints: e.target.value }))}
                disabled={isCompleted}
                rows={6}
                className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="見学して「すごい」と思ったことを記入してください"
              />
            </div>

            <div className="mb-6">
              <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                <label className="block text-gray-700 text-sm font-bold">
                  医院で実践したいこと
                </label>
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={addActionItem}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
                  >
                    ＋ 追加
                  </button>
                )}
              </div>

              {formData.actionItems.length === 0 ? (
                <p className="text-gray-500 text-sm">「＋追加」ボタンで項目を追加してください</p>
              ) : (
                <div className="space-y-6">
                  {formData.actionItems.map((item) => (
                    <div key={item.id} className="border border-gray-300 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">項目 {formData.actionItems.indexOf(item) + 1}</h3>
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => removeActionItem(item.id)}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline"
                          >
                            削除
                          </button>
                        )}
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          タイトル
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateActionItem(item.id, 'title', e.target.value)}
                          disabled={isCompleted}
                          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="タイトルを入力"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          内容
                        </label>
                        <textarea
                          value={item.content}
                          onChange={(e) => updateActionItem(item.id, 'content', e.target.value)}
                          disabled={isCompleted}
                          rows={4}
                          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${isCompleted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          placeholder="内容を入力"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          写真
                        </label>
                        <PhotoUpload
                          value={getItemPhotos(item)}
                          onChange={(photos) => updateActionItem(item.id, 'photos', photos)}
                          disabled={isCompleted}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                {isCompleted ? 'レポート一覧に戻る' : 'キャンセル'}
              </button>
              {!isCompleted && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleTemporarySave}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    一時保存
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    完了
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
