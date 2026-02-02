import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { reportApi } from '../utils/api';
import { normalizeBase64PDF } from '../utils/pdf';
import type { Report } from '../types';

export const ReportShared = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!token) {
        setError('共有トークンが指定されていません');
        setLoading(false);
        return;
      }

      try {
        const loadedReport = await reportApi.getByShareToken(token);
        setReport(loadedReport);
      } catch (err: any) {
        console.error('レポート読み込みエラー:', err);
        setError(err.message || 'レポートの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '日付未設定';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
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

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !report) {
    return (
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">エラー</h2>
            <p className="text-gray-700 mb-4">
              {error || 'レポートが見つかりません'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              共有リンクが無効であるか、レポートが削除された可能性があります。
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              トップページに戻る
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-4 sm:p-8 min-w-0 overflow-hidden">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">歯科医院見学レポート</h1>
            <p className="text-sm text-gray-500">共有リンク経由で表示中</p>
          </div>

          <div className="space-y-6">
            {/* 基本情報 */}
            <div className="border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">見学日</p>
                  <p className="text-lg font-medium">{formatDate(report.visitDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">見学先医院名</p>
                  <p className="text-lg font-medium">{report.clinicName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">都道府県</p>
                  <p className="text-lg font-medium">{report.prefecture}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">市</p>
                  <p className="text-lg font-medium">{report.city}</p>
                </div>
              </div>
            </div>

            {/* 見学先医院情報 */}
            {report.visitedClinicWebsiteUrl || 
             (report.visitedClinicChairCount !== undefined && report.visitedClinicChairCount !== null) ||
             (report.visitedClinicStaffCount !== undefined && report.visitedClinicStaffCount !== null) ||
             (report.visitedClinicNewPatientsPerMonth !== undefined && report.visitedClinicNewPatientsPerMonth !== null) ||
             (report.visitedClinicSelfPayRate !== undefined && report.visitedClinicSelfPayRate !== null) ||
             (report.visitedClinicRecallCount !== undefined && report.visitedClinicRecallCount !== null) ||
             (report.visitedClinicInsurancePointsPerMonth !== undefined && report.visitedClinicInsurancePointsPerMonth !== null) ||
             (report.visitedClinicStrengths && report.visitedClinicStrengths.length > 0) ? (
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">見学先医院情報</h2>
                <div className="space-y-3">
                  {report.visitedClinicWebsiteUrl && (
                    <div>
                      <p className="text-sm text-gray-600">医院見学先のHP</p>
                      <a 
                        href={report.visitedClinicWebsiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {report.visitedClinicWebsiteUrl}
                      </a>
                    </div>
                  )}
                  {report.visitedClinicChairCount !== undefined && report.visitedClinicChairCount !== null && (
                    <div>
                      <p className="text-sm text-gray-600">チェア台数</p>
                      <p className="text-lg">{report.visitedClinicChairCount}台</p>
                    </div>
                  )}
                  {report.visitedClinicStaffCount !== undefined && report.visitedClinicStaffCount !== null && (
                    <div>
                      <p className="text-sm text-gray-600">スタッフ人数</p>
                      <p className="text-lg">{report.visitedClinicStaffCount}人</p>
                    </div>
                  )}
                  {report.visitedClinicNewPatientsPerMonth !== undefined && report.visitedClinicNewPatientsPerMonth !== null && (
                    <div>
                      <p className="text-sm text-gray-600">新規患者数/月</p>
                      <p className="text-lg">{report.visitedClinicNewPatientsPerMonth}人</p>
                    </div>
                  )}
                  {report.visitedClinicSelfPayRate !== undefined && report.visitedClinicSelfPayRate !== null && (
                    <div>
                      <p className="text-sm text-gray-600">自費率</p>
                      <p className="text-lg">{report.visitedClinicSelfPayRate}%</p>
                    </div>
                  )}
                  {report.visitedClinicRecallCount !== undefined && report.visitedClinicRecallCount !== null && (
                    <div>
                      <p className="text-sm text-gray-600">リコール人数</p>
                      <p className="text-lg">{report.visitedClinicRecallCount}人</p>
                    </div>
                  )}
                  {report.visitedClinicInsurancePointsPerMonth !== undefined && report.visitedClinicInsurancePointsPerMonth !== null && (
                    <div>
                      <p className="text-sm text-gray-600">保険金額（円）</p>
                      <p className="text-lg">{report.visitedClinicInsurancePointsPerMonth.toLocaleString()}円</p>
                    </div>
                  )}
                  {report.visitedClinicStrengths && report.visitedClinicStrengths.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">医院見学先の強み</p>
                      <div className="flex flex-wrap gap-2">
                        {report.visitedClinicStrengths.map((strength, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* あなたの医院情報 */}
            {(report.myClinicName || report.myClinicWebsiteUrl) && (
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">あなたの医院情報</h2>
                <div className="space-y-3">
                  {report.myClinicName && (
                    <div>
                      <p className="text-sm text-gray-600">医院名</p>
                      <p className="text-lg font-medium">{report.myClinicName}</p>
                    </div>
                  )}
                  {report.myClinicWebsiteUrl && (
                    <div>
                      <p className="text-sm text-gray-600">あなたの医院のHPのURL</p>
                      <a 
                        href={report.myClinicWebsiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {report.myClinicWebsiteUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* すごいと思ったこと */}
            {report.impressivePoints && (
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">すごいと思ったこと</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-gray-700">{report.impressivePoints}</p>
                </div>
              </div>
            )}

            {/* 医院で実践したいこと */}
            {report.actionItems && report.actionItems.length > 0 && (
              <div className="border-b pb-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">医院で実践したいこと</h2>
                <div className="space-y-4">
                  {report.actionItems.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        項目 {index + 1}
                        {item.title && `: ${item.title}`}
                      </h3>
                      {item.content && (
                        <p className="whitespace-pre-wrap text-gray-700 mb-3">{item.content}</p>
                      )}
                      {(item.photos ?? (item.photo ? [item.photo] : [])).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-3">
                          {(item.photos ?? (item.photo ? [item.photo] : [])).map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`項目 ${index + 1} の写真 ${i + 1}`}
                              className="max-w-full h-auto max-h-48 object-contain rounded-lg border border-gray-300"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDFダウンロード */}
            {report.pdfData && (
              <div className="pt-4">
                <button
                  onClick={async () => {
                    try {
                      console.log('=== PDFダウンロード開始（共有ページ） ===');
                      console.log('レポートID:', report.id);
                      
                      // Base64データの検証と正規化
                      let pdfData: string;
                      try {
                        pdfData = normalizeBase64PDF(report.pdfData);
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
                      console.error('=== PDFダウンロードエラー（共有ページ） ===');
                      console.error('エラー詳細:', error);
                      console.error('エラーメッセージ:', error.message);
                      console.error('========================');
                      alert(`PDFのダウンロードに失敗しました\n\n${error.message || '不明なエラー'}`);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  PDFをダウンロード
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
