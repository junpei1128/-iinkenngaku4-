import type { Recipient, Report } from '../types';

const RECIPIENTS_KEY = 'dentist_recipients';
const REPORTS_KEY = 'dentist_reports';

// 通知先関連の関数
export const getRecipients = (): Recipient[] => {
  try {
    const data = localStorage.getItem(RECIPIENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading recipients:', error);
    return [];
  }
};

export const saveRecipient = (recipient: Recipient): void => {
  try {
    const recipients = getRecipients();
    // 既に同じIDの通知先が存在する場合は更新、存在しない場合は追加
    const existingIndex = recipients.findIndex(r => r.id === recipient.id);
    if (existingIndex >= 0) {
      recipients[existingIndex] = recipient;
    } else {
      recipients.push(recipient);
    }
    localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(recipients));
  } catch (error) {
    console.error('Error saving recipient:', error);
    throw error;
  }
};

export const updateRecipient = (recipient: Recipient): void => {
  try {
    const recipients = getRecipients();
    const index = recipients.findIndex(r => r.id === recipient.id);
    if (index >= 0) {
      recipients[index] = recipient;
      localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(recipients));
    }
  } catch (error) {
    console.error('Error updating recipient:', error);
    throw error;
  }
};

export const deleteRecipient = (id: string): void => {
  try {
    const recipients = getRecipients();
    const filtered = recipients.filter(r => r.id !== id);
    localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting recipient:', error);
    throw error;
  }
};

// レポート関連の関数
export const getReports = (): Report[] => {
  try {
    const data = localStorage.getItem(REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading reports:', error);
    return [];
  }
};

export const saveReport = (report: Report): void => {
  try {
    const reports = getReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);
    
    if (existingIndex >= 0) {
      // 既存のレポートを更新
      reports[existingIndex] = report;
    } else {
      // 新しいレポートを追加
      reports.push(report);
    }
    
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

export const getReportById = (id: string): Report | undefined => {
  const reports = getReports();
  return reports.find(r => r.id === id);
};

export const deleteReport = (id: string): void => {
  const reports = getReports();
  const filtered = reports.filter(r => r.id !== id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(filtered));
};
