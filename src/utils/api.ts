import type { Recipient, Report } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// トークンを取得
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// トークンを保存
export const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// トークンを削除
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// APIリクエストの共通処理
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchError) {
    // ネットワークエラー（サーバーに接続できない場合）
    console.error('API接続エラー詳細:', {
      endpoint,
      apiBaseUrl: API_BASE_URL,
      fullUrl: `${API_BASE_URL}${endpoint}`,
      error: fetchError,
      errorType: fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError,
      errorMessage: fetchError instanceof Error ? fetchError.message : String(fetchError),
      timestamp: new Date().toISOString(),
    });
    
    // ブラウザのコンソールで確認できるように、より詳細な情報を提供
    if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
      const errorMsg = `サーバーに接続できません。バックエンドサーバー（${API_BASE_URL}）が起動しているか確認してください。\n\n確認方法:\n1. PowerShellで .\\check-backend-status.ps1 を実行\n2. ブラウザで ${API_BASE_URL}/health にアクセス\n3. サーバーログを確認`;
      throw new Error(errorMsg);
    }
    throw new Error(`ネットワークエラー: ${fetchError instanceof Error ? fetchError.message : '不明なエラー'}`);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      // JSONパースに失敗した場合、ステータステキストを使用
      errorMessage = response.statusText || errorMessage;
    }
    
    // 認証エラーの場合
    if (response.status === 401) {
      // ログインエンドポイントの場合は、サーバーからのエラーメッセージをそのまま使用
      if (endpoint.includes('/auth/login')) {
        // ログインエラーの場合は、サーバーからのメッセージを優先
        throw new Error(errorMessage);
      } else {
        // その他の認証エラーの場合は、トークンを削除してメッセージを表示
        removeToken();
        throw new Error('認証が必要です。ログインしてください。');
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

// 認証API
export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const data = await apiRequest<{ success: boolean; token: string; user: any }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      if (data.success && data.token) {
        setToken(data.token);
      }
      return data;
    } catch (error: any) {
      console.error('ログインAPIエラー:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    const data = await apiRequest<{ success: boolean; token: string; user: any }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    );
    if (data.success && data.token) {
      setToken(data.token);
    }
    return data;
  },

  getMe: async () => {
    return apiRequest<{ success: boolean; user: any }>('/api/auth/me');
  },

  logout: () => {
    removeToken();
  },
};

// レポートAPI
export const reportApi = {
  getAll: async (): Promise<Report[]> => {
    const data = await apiRequest<{ success: boolean; reports: Report[] }>('/api/reports');
    return data.reports;
  },

  getById: async (id: string): Promise<Report> => {
    const data = await apiRequest<{ success: boolean; report: Report }>(`/api/reports/${id}`);
    return data.report;
  },

  create: async (report: Omit<Report, 'id' | 'createdAt' | 'version'>): Promise<Report> => {
    const data = await apiRequest<{ success: boolean; report: Report }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
    return data.report;
  },

  update: async (id: string, report: Partial<Report> & { version: number }): Promise<Report> => {
    const data = await apiRequest<{ success: boolean; report: Report }>(`/api/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(report),
    });
    return data.report;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<{ success: boolean }>(`/api/reports/${id}`, {
      method: 'DELETE',
    });
  },

  // 認証不要の共有レポート取得
  getByShareToken: async (token: string): Promise<Report> => {
    // 認証不要なので、直接fetchを使用
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${API_BASE_URL}/api/reports/shared/${token}`);
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data.report;
  },
};

// 通知先API
export const recipientApi = {
  getAll: async (): Promise<Recipient[]> => {
    const data = await apiRequest<{ success: boolean; recipients: Recipient[] }>('/api/recipients');
    return data.recipients;
  },

  getById: async (id: string): Promise<Recipient> => {
    const data = await apiRequest<{ success: boolean; recipient: Recipient }>(`/api/recipients/${id}`);
    return data.recipient;
  },

  create: async (recipient: Omit<Recipient, 'id'>): Promise<Recipient> => {
    const data = await apiRequest<{ success: boolean; recipient: Recipient }>('/api/recipients', {
      method: 'POST',
      body: JSON.stringify(recipient),
    });
    return data.recipient;
  },

  update: async (id: string, recipient: Partial<Recipient>): Promise<Recipient> => {
    const data = await apiRequest<{ success: boolean; recipient: Recipient }>(`/api/recipients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipient),
    });
    return data.recipient;
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<{ success: boolean }>(`/api/recipients/${id}`, {
      method: 'DELETE',
    });
  },
};
