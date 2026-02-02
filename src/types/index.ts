export interface Recipient {
  id: string;
  name: string;      // 通知先の名前
  email: string;      // メールアドレス
}

export interface ActionItem {
  id: string;
  title: string;       // タイトル
  content: string;     // 内容
  /** @deprecated 後方互換のため残しています。photos を利用してください */
  photo?: string;      // Base64エンコードされた写真（1枚・旧形式）
  photos?: string[];   // Base64エンコードされた写真（複数枚）
}

export interface Report {
  id: string;
  visitDate: string;           // 見学日（YYYY-MM-DD）
  clinicName: string;           // 見学先医院名
  prefecture: string;           // 都道府県
  city: string;                 // 市
  visitedClinicWebsiteUrl?: string; // 医院見学先のHP
  visitedClinicChairCount?: number; // チェア台数
  visitedClinicStaffCount?: number; // スタッフ人数
  visitedClinicNewPatientsPerMonth?: number; // 新規患者数/月
  visitedClinicSelfPayRate?: number; // 自費率（%）
  visitedClinicRecallCount?: number; // リコール人数
  visitedClinicInsurancePointsPerMonth?: number; // 保険金額（円）
  visitedClinicStrengths?: string[]; // 医院見学先の強み（複数選択可）
  myClinicName?: string;        // あなたの医院名
  myClinicWebsiteUrl?: string;  // あなたの医院のHPのURL
  impressivePoints: string;     // すごいと思ったこと（長文）
  actionItems: ActionItem[];    // 医院で実践したいこと
  pdfData?: string;              // Base64エンコードされたPDFデータ
  isCompleted?: boolean;         // 完了済みフラグ
  version?: number;              // 楽観的ロック用バージョン番号
  shareToken?: string;           // 認証不要の共有リンク用トークン
  createdAt: string;            // 作成日時
  updatedAt?: string;            // 更新日時
}
