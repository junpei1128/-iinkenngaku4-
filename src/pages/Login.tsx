import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { authApi } from '../utils/api';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // バリデーション
    if (!username.trim()) {
      setError('メールアドレスを入力してください');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setError('パスワードを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      // ログイン試行（前後の空白を削除してから認証）
      const trimmedEmail = username.trim();
      const trimmedPassword = password.trim();
      const result = await authApi.login(trimmedEmail, trimmedPassword);
      
      if (result.success) {
        // ログイン成功時、通知先登録ページにリダイレクト
        navigate('/recipients', { replace: true });
      } else {
        setError('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (err: any) {
      console.error('ログインエラー詳細:', err);
      
      // エラーメッセージを詳細に表示
      let errorMessage = err.message || 'ログインに失敗しました';
      
      // サーバー接続エラーの場合
      if (errorMessage.includes('サーバーに接続できません') || errorMessage.includes('ネットワークエラー')) {
        errorMessage = 'サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。';
      }
      // ユーザーが存在しない、またはパスワードが間違っている場合
      else if (errorMessage.includes('メールアドレスまたはパスワードが正しくありません')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。ユーザーが存在しない場合は、初期ユーザーを作成してください。';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow-md rounded-lg px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              ログイン
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  メールアドレス
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    error ? 'border-red-500' : ''
                  }`}
                  placeholder="IDを入力"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    error ? 'border-red-500' : ''
                  }`}
                  placeholder="パスワードを入力"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="mb-4">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={isLoading}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};
