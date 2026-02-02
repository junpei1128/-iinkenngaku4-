import type { Recipient, Report } from '../types';
import { getToken } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SendNotificationResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  error?: string;
  details?: any;
  successful?: Array<{ email: string; name: string }>;
  failed?: Array<{ email: string; name: string; reason: string }>;
  invalidRecipients?: Array<{ email: string; name: string; reason: string }>;
}

/**
 * レポート完了通知を送信
 */
export const sendReportNotification = async (
  recipients: Recipient[],
  report: Report,
  appUrl: string = window.location.origin,
  pdfData?: string,
  shareToken?: string
): Promise<SendNotificationResponse> => {
  try {
    // 通知先が空の場合はスキップ
    if (!recipients || recipients.length === 0) {
      return {
        success: true,
        message: '通知先が登録されていないため、メール送信をスキップしました',
        sentCount: 0,
      };
    }

    // 共有リンクを生成（共有トークンがある場合は認証不要のリンク、ない場合は通常のリンク）
    const reportLink = shareToken 
      ? `${appUrl}/reports/shared/${shareToken}`
      : `${appUrl}/reports/${report.id}`;

    // レポート情報を準備
    const reportInfo = {
      myClinicName: report.myClinicName || '未設定',
      clinicName: report.clinicName,
      visitDate: report.visitDate,
      prefecture: report.prefecture,
      city: report.city,
      reportId: report.id,
    };

    // 認証トークンを取得
    const token = getToken();
    if (!token) {
      return {
        success: false,
        message: '認証が必要です。ログインし直してください。',
        error: '認証トークンがありません',
      };
    }

    // APIリクエスト
    const response = await fetch(`${API_BASE_URL}/api/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipients,
        report: reportInfo,
        reportLink,
        pdfData,
        shareToken,
      }),
    });

    // レスポンスがJSONかどうかを確認
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        // JSONパースに失敗した場合
        const text = await response.text();
        return {
          success: false,
          message: 'サーバーエラーが発生しました',
          error: `JSONパースエラー: ${text.substring(0, 200)}`,
          details: text,
        };
      }
    } else {
      // JSONでない場合（テキストエラーなど）
      const text = await response.text();
      return {
        success: false,
        message: 'サーバーエラーが発生しました',
        error: text || `HTTP ${response.status} ${response.statusText}`,
        details: text,
      };
    }

    if (!response.ok) {
      // 認証エラーの場合、より分かりやすいメッセージを返す
      if (response.status === 401) {
        return {
          success: false,
          message: '認証が必要です。ログインし直してください。',
          error: data.error || '認証が必要です',
          details: data.details || data.message,
          sentCount: data.sentCount || 0,
          failedCount: data.failedCount || 0,
          successful: data.successful || [],
          failed: data.failed || [],
          invalidRecipients: data.invalidRecipients || [],
        };
      }
      
      return {
        success: false,
        message: data.error || 'メール送信に失敗しました',
        error: data.error || data.message || 'サーバーエラーが発生しました',
        details: data.details || data.message,
        sentCount: data.sentCount || 0,
        failedCount: data.failedCount || 0,
        successful: data.successful || [],
        failed: data.failed || [],
        invalidRecipients: data.invalidRecipients || [],
      };
    }

    return {
      success: data.success !== false,
      message: data.message || `${data.sentCount || recipients.length}件のメールを送信しました`,
      sentCount: data.sentCount || recipients.length,
      failedCount: data.failedCount || 0,
      successful: data.successful || [],
      failed: data.failed || [],
      invalidRecipients: data.invalidRecipients || [],
    };
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    return {
      success: false,
      message: 'メール送信に失敗しました',
      error: error.message || 'ネットワークエラー',
    };
  }
};
