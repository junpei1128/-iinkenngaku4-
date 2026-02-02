// 認証関連のユーティリティ関数
import { getToken, removeToken } from './api';

// 認証状態を取得（トークンの存在をチェック）
export const getAuth = (): boolean => {
  const token = getToken();
  return !!token;
};

// ログアウト
export const logout = (): void => {
  removeToken();
};
