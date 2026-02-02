export interface Recipient {
  name: string;
  email: string;
}

export interface ReportInfo {
  myClinicName: string;
  clinicName: string;
  visitDate: string;
  prefecture: string;
  city: string;
  reportId: string;
}

export interface SendNotificationRequest {
  recipients: Recipient[];
  report: ReportInfo;
  reportLink: string;
  pdfData?: string; // Base64エンコードされたPDFデータ
  shareToken?: string; // 共有トークン
}
