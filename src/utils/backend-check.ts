/**
 * バックエンドサーバーの接続確認ユーティリティ
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * バックエンドサーバーへの接続をテストする
 * @returns 接続可能な場合true、そうでない場合false
 */
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // タイムアウトを短く設定（3秒）
      signal: AbortSignal.timeout(3000),
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Backend connection test failed:', error);
    return false;
  }
};

/**
 * バックエンドサーバーの接続状態を確認し、接続できない場合は警告を表示
 */
export const checkBackendConnection = async (): Promise<void> => {
  const isConnected = await testBackendConnection();
  
  if (!isConnected) {
    console.warn('⚠️ バックエンドサーバーに接続できません');
    console.warn(`   バックエンドURL: ${API_BASE_URL}`);
    console.warn('   確認事項:');
    console.warn('   1. バックエンドサーバーが起動しているか確認');
    console.warn('   2. ブラウザで http://localhost:3001 にアクセスできるか確認');
    console.warn('   3. PowerShellウィンドウでバックエンドサーバーのログを確認');
  } else {
    console.log('✓ バックエンドサーバーに接続できました');
  }
};
