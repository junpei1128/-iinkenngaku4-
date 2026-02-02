import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { reportApi, removeToken } from '../utils/api';
import { generateReportPDF, normalizeBase64PDF } from '../utils/pdf';
import { getAuth } from '../utils/auth';
import type { Report } from '../types';

type TabType = 'draft' | 'completed';

export const ReportList = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('draft');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const displayReports = reports.filter((r) =>
    activeTab === 'draft' ? !r.isCompleted : !!r.isCompleted
  );

  const loadReports = async () => {
    setLoadError(null);
    setIsLoading(true);

    try {
      console.log('=== レポート一覧取得開始 ===');
      const loadedReports = await reportApi.getAll();
      
      // デバッグログ: 取得成功時の情報を記録
      console.log('レポート取得成功');
      console.log('取得件数:', loadedReports.length);
      if (loadedReports.length > 0) {
        console.log('最初のレポートID:', loadedReports[0].id);
        console.log('最初のレポートclinicName:', loadedReports[0].clinicName);
      } else {
        console.log('取得したレポートが0件です');
      }
      
      // 見学日でソート（新しい順）
      const sorted = loadedReports.sort((a, b) => {
        try {
          const dateA = new Date(a.visitDate).getTime();
          const dateB = new Date(b.visitDate).getTime();
          if (isNaN(dateA) || isNaN(dateB)) {
            return 0;
          }
          return dateB - dateA;
        } catch (error) {
          console.error('Error sorting reports:', error);
          return 0;
        }
      });
      setReports(sorted);
      console.log('レポート一覧を更新しました（件数:', sorted.length, '）');
      console.log('========================');
    } catch (error: any) {
      setReports([]);
      console.error('=== レポート読み込みエラー ===');
      console.error('エラー詳細:', error);
      const errorMessage = error.message || 'レポートの読み込みに失敗しました';
      console.error('エラーメッセージ:', errorMessage);
      
      // 認証エラーの場合のみ自動的にログインページにリダイレクト（アラートなし）
      // サーバー接続エラーは認証エラーではないので、リダイレクトしない
      if (errorMessage.includes('認証') || 
          errorMessage.includes('無効なトークン') || 
          errorMessage.includes('401') ||
          errorMessage.includes('認証が必要')) {
        console.log('認証エラーのため、ログインページにリダイレクトします');
        // トークンを削除
        removeToken();
        // ログインページにリダイレクト（アラートなしで静かにリダイレクト）
        navigate('/login', { replace: true });
        return;
      }

      setLoadError('レポート一覧の取得に失敗しました。バックエンドサーバーが起動しているか確認してください。');
      console.warn('レポート読み込みエラー（続行）: 空のリストを表示します');
      console.warn('エラー内容:', errorMessage);
      console.error('========================');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = () => {
    setIsAuthenticated(getAuth());
  };

  useEffect(() => {
    loadReports();
    checkAuth();
  }, []);

  const handleDeleteReport = async (reportId: string, reportName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを防ぐ
    
    // 認証チェック
    if (!getAuth()) {
      if (window.confirm('レポートを削除するにはログインが必要です。ログインページに移動しますか？')) {
        navigate('/login');
      }
      return;
    }

    // 削除確認
    if (window.confirm(`「${reportName}」のレポートを削除しますか？\nこの操作は取り消せません。`)) {
      try {
        await reportApi.delete(reportId);
        await loadReports();
        alert('レポートを削除しました');
      } catch (error: any) {
        console.error('レポート削除エラー:', error);
        alert('レポートの削除に失敗しました: ' + error.message);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // 無効な日付の場合はそのまま返す
      }
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const handleDownloadPDF = async (report: Report, e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを防ぐ
    
    try {
      console.log('=== PDFダウンロード開始 ===');
      console.log('レポートID:', report.id);
      
      let pdfData = report.pdfData;
      
      // PDFが存在しない場合は生成
      if (!pdfData) {
        console.log('PDFデータが存在しないため、生成を開始します');
        if (!window.confirm('PDFがまだ生成されていません。今すぐ生成しますか？')) {
          return;
        }
        
        try {
          pdfData = await generateReportPDF(report);
          console.log('PDF生成成功');
          
          // 生成したPDFをレポートに保存
          if (!report.version || report.version < 1) {
            throw new Error('バージョン情報が不正です。');
          }
          await reportApi.update(report.id, {
            pdfData,
            version: report.version,
          });
          console.log('PDFデータをサーバーに保存しました');
        } catch (genError: any) {
          console.error('PDF生成エラー:', genError);
          throw new Error(`PDFの生成に失敗しました: ${genError.message || '不明なエラー'}`);
        }
      }
      
      // Base64データの検証と正規化
      try {
        pdfData = normalizeBase64PDF(pdfData);
        console.log('Base64データの検証成功（長さ:', pdfData.length, '）');
      } catch (normError: any) {
        console.error('Base64データの検証エラー:', normError);
        throw new Error(`PDFデータの形式が正しくありません: ${normError.message}`);
      }
      
      // Base64データをBlobに変換
      let blob: Blob;
      try {
        const binaryString = atob(pdfData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/pdf' });
        console.log('Blob作成成功（サイズ:', blob.size, 'bytes）');
      } catch (decodeError: any) {
        console.error('Base64デコードエラー:', decodeError);
        throw new Error(`PDFデータのデコードに失敗しました: ${decodeError.message || '不明なエラー'}`);
      }
      
      // ダウンロード
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `レポート_${report.clinicName}_${report.visitDate}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('PDFダウンロード成功');
        console.log('========================');
      } catch (downloadError: any) {
        console.error('ダウンロード処理エラー:', downloadError);
        throw new Error(`ダウンロード処理に失敗しました: ${downloadError.message || '不明なエラー'}`);
      }
    } catch (error: any) {
      console.error('=== PDFダウンロードエラー ===');
      console.error('エラー詳細:', error);
      console.error('エラーメッセージ:', error.message);
      console.error('========================');
      alert(`PDFのダウンロードに失敗しました\n\n${error.message || '不明なエラー'}`);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">レポート一覧</h2>
            <button
              onClick={() => navigate('/reports/new')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              ＋ 新規作成
            </button>
          </div>

          {reports.length > 0 && (
            <div className="mb-4 flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('draft')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'draft'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                一時保存
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px focus:outline-none ${
                  activeTab === 'completed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                完了
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="bg-white shadow rounded-lg p-12 text-center" aria-busy="true">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status" aria-label="読み込み中" />
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              {loadError ? (
                <>
                  <p className="text-red-600 text-lg mb-2 font-semibold">エラー</p>
                  <p className="text-gray-600 text-sm mb-4">{loadError}</p>
                  <button
                    onClick={loadReports}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
                  >
                    再読み込み
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-lg mb-4">レポートがありません</p>
              )}
              <button
                onClick={() => navigate('/reports/new')}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                新規レポートを作成
              </button>
            </div>
          ) : displayReports.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500 text-lg mb-4">
                {activeTab === 'draft' ? '一時保存のレポートはありません' : '完了レポートはありません'}
              </p>
              <button
                onClick={() => navigate('/reports/new')}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                新規レポートを作成
              </button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => navigate(`/reports/${report.id}`)}
                  className={`bg-white shadow-md rounded-lg p-4 sm:p-6 transition-shadow min-w-0 overflow-hidden ${
                    report.isCompleted 
                      ? 'cursor-pointer opacity-90' 
                      : 'cursor-pointer hover:shadow-lg'
                  }`}
                >
                  <div className="mb-4 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 min-w-0">
                        {report.clinicName}
                      </h3>
                      {report.isCompleted && (
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded flex-shrink-0">
                          完了
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {report.prefecture} {report.city}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      見学日: {formatDate(report.visitDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      作成日: {formatDate(report.createdAt)}
                    </p>
                  </div>

                  {/* 医院見学先の情報 */}
                  {(report.visitedClinicWebsiteUrl ||
                    report.visitedClinicChairCount !== undefined ||
                    report.visitedClinicStaffCount !== undefined ||
                    report.visitedClinicNewPatientsPerMonth !== undefined ||
                    report.visitedClinicRecallCount !== undefined ||
                    (report.visitedClinicStrengths && report.visitedClinicStrengths.length > 0)) && (
                    <div className="mb-4 pt-4 border-t">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">医院見学先の情報</h4>
                      {report.visitedClinicWebsiteUrl && (
                        <div className="mb-2">
                          <a
                            href={report.visitedClinicWebsiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all"
                          >
                            {report.visitedClinicWebsiteUrl}
                          </a>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {report.visitedClinicChairCount !== undefined && (
                          <div>
                            <span className="text-gray-600">チェア台数:</span>
                            <span className="text-gray-900 font-medium ml-1">{report.visitedClinicChairCount}</span>
                          </div>
                        )}
                        {report.visitedClinicStaffCount !== undefined && (
                          <div>
                            <span className="text-gray-600">スタッフ人数:</span>
                            <span className="text-gray-900 font-medium ml-1">{report.visitedClinicStaffCount}</span>
                          </div>
                        )}
                        {report.visitedClinicNewPatientsPerMonth !== undefined && (
                          <div>
                            <span className="text-gray-600">新規患者数/月:</span>
                            <span className="text-gray-900 font-medium ml-1">{report.visitedClinicNewPatientsPerMonth}</span>
                          </div>
                        )}
                        {report.visitedClinicRecallCount !== undefined && (
                          <div>
                            <span className="text-gray-600">リコール人数:</span>
                            <span className="text-gray-900 font-medium ml-1">{report.visitedClinicRecallCount}</span>
                          </div>
                        )}
                      </div>
                      {report.visitedClinicStrengths && report.visitedClinicStrengths.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-600 text-xs">強み: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {report.visitedClinicStrengths.map((strength, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                {strength}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {report.impressivePoints && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {report.impressivePoints}
                      </p>
                    </div>
                  )}

                  {report.actionItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        やりたいこと: {report.actionItems.length}件
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center justify-between">
                    <span className="text-blue-600 text-sm font-medium">
                      詳細を見る →
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={(e) => handleDownloadPDF(report, e)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline"
                        title="PDFダウンロード"
                      >
                        PDF
                      </button>
                      {isAuthenticated && (
                        <button
                          onClick={(e) => handleDeleteReport(report.id, report.clinicName, e)}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline"
                          title="レポートを削除"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
