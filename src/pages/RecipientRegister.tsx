import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { recipientApi } from '../utils/api';
import { getAuth, logout } from '../utils/auth';
import type { Recipient } from '../types';

export const RecipientRegister = () => {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedRecipientIds, setSavedRecipientIds] = useState<Set<string>>(new Set());

  const loadRecipients = async () => {
    try {
      const loadedRecipients = await recipientApi.getAll();
      setRecipients(loadedRecipients);
      // 読み込んだ通知先をすべて保存済みとしてマーク
      setSavedRecipientIds(new Set(loadedRecipients.map(r => r.id)));
    } catch (error: any) {
      console.error('通知先読み込みエラー:', error);
      if (error.message?.includes('認証') || error.message?.includes('401')) {
        navigate('/login');
      } else {
        alert('通知先の読み込みに失敗しました');
      }
    }
  };

  useEffect(() => {
    // 認証チェック
    if (!getAuth()) {
      navigate('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecipients();
  }, [navigate]);

  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      logout();
      navigate('/login');
    }
  };

  // 無効なドメインのリスト（よくあるテスト用・例示用ドメイン）
  const INVALID_DOMAINS = [
    'example.com',
    'example.org',
    'example.net',
    'test.com',
    'test.org',
    'localhost',
    'invalid.com',
    'invalid.org',
    'sample.com',
    'sample.org',
    'dummy.com',
    'dummy.org',
  ];

  // よくある無効なメールアドレスのパターン
  const INVALID_EMAIL_PATTERNS = [
    /^test@/i,
    /^example@/i,
    /^sample@/i,
    /^dummy@/i,
    /@example\.(com|org|net)$/i,
    /@test\.(com|org)$/i,
    /@localhost$/i,
    /@invalid\.(com|org)$/i,
    /@sample\.(com|org)$/i,
    /@dummy\.(com|org)$/i,
  ];

  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email || !email.trim()) {
      return { valid: false, error: 'メールアドレスを入力してください' };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 基本的な形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, error: 'メールアドレスの形式が正しくありません' };
    }

    // ドメイン部分を抽出
    const domain = trimmedEmail.split('@')[1];
    if (!domain) {
      return { valid: false, error: 'ドメインが指定されていません' };
    }

    // 無効なドメインのチェック
    if (INVALID_DOMAINS.includes(domain)) {
      return { 
        valid: false, 
        error: `無効なドメインです（${domain}）。実際に存在するメールアドレスを指定してください。` 
      };
    }

    // 無効なメールアドレスのパターンチェック
    for (const pattern of INVALID_EMAIL_PATTERNS) {
      if (pattern.test(trimmedEmail)) {
        return { 
          valid: false, 
          error: `無効なメールアドレスです。実際に存在するメールアドレスを指定してください。` 
        };
      }
    }

    return { valid: true };
  };

  const handleAdd = () => {
    const newRecipient: Recipient = {
      id: crypto.randomUUID(),
      name: '',
      email: '',
    };
    const updatedRecipients = [...recipients, newRecipient];
    setRecipients(updatedRecipients);
  };

  const handleChange = (id: string, field: 'name' | 'email', value: string) => {
    setRecipients(prev =>
      prev.map(recipient =>
        recipient.id === id ? { ...recipient, [field]: value } : recipient
      )
    );
    // エラーをクリア
    const errorKey = `${id}-${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    // 保存済み表示をクリア（編集されたため）
    if (savedRecipientIds.has(id)) {
      setSavedRecipientIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleSave = async (recipient: Recipient) => {
    const newErrors: Record<string, string> = {};

    if (!recipient.name.trim()) {
      newErrors[`${recipient.id}-name`] = '名前を入力してください';
    }

    const emailValidation = validateEmail(recipient.email);
    if (!emailValidation.valid) {
      newErrors[`${recipient.id}-email`] = emailValidation.error || '有効なメールアドレスを入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // 保存処理（既存の場合は更新、新規の場合は追加を行う）
    try {
      let savedRecipient: Recipient;
      // 既に保存済みの通知先かどうかを判定（savedRecipientIdsで確認）
      if (savedRecipientIds.has(recipient.id)) {
        // 既存の通知先を更新
        try {
          savedRecipient = await recipientApi.update(recipient.id, {
            name: recipient.name,
            email: recipient.email,
          });
        } catch (updateError: any) {
          // 更新に失敗した場合（通知先が見つからない場合）、新規作成として処理
          if (updateError.message?.includes('見つかりません') || updateError.message?.includes('404')) {
            console.log('通知先が見つからないため、新規作成として処理します');
            savedRecipient = await recipientApi.create({
              name: recipient.name,
              email: recipient.email,
            });
            // IDを更新
            setRecipients(prev =>
              prev.map(r => (r.id === recipient.id ? savedRecipient : r))
            );
          } else {
            throw updateError;
          }
        }
      } else {
        // 新規通知先を作成
        savedRecipient = await recipientApi.create({
          name: recipient.name,
          email: recipient.email,
        });
        // IDを更新
        setRecipients(prev =>
          prev.map(r => (r.id === recipient.id ? savedRecipient : r))
        );
      }
      
      await loadRecipients();
      // エラーをクリア
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${recipient.id}-name`];
        delete newErrors[`${recipient.id}-email`];
        return newErrors;
      });
      // 保存済み表示を追加（ずっと表示）
      setSavedRecipientIds(prev => new Set(prev).add(savedRecipient.id));
    } catch (error: any) {
      console.error('保存エラー:', error);
      const errorMessage = error.message || '保存に失敗しました';
      alert(errorMessage);
      // エラーメッセージを表示
      if (errorMessage.includes('既に登録')) {
        setErrors(prev => ({
          ...prev,
          [`${recipient.id}-email`]: 'このメールアドレスは既に登録されています',
        }));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('この通知先を削除しますか？')) {
      try {
        await recipientApi.delete(id);
        await loadRecipients();
      } catch (error: any) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました: ' + error.message);
      }
    }
  };

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">通知先登録</h2>
            <button
              type="button"
              onClick={handleLogout}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-sm"
            >
              ログアウト
            </button>
          </div>

          <div className="space-y-4 mb-6">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="bg-white shadow-md rounded-lg p-4 sm:p-6 border border-gray-200 min-w-0 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recipient.name}
                      onChange={(e) => handleChange(recipient.id, 'name', e.target.value)}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        errors[`${recipient.id}-name`] ? 'border-red-500' : ''
                      }`}
                      placeholder="名前を入力"
                    />
                    {errors[`${recipient.id}-name`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`${recipient.id}-name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={recipient.email}
                      onChange={(e) => handleChange(recipient.id, 'email', e.target.value)}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        errors[`${recipient.id}-email`] ? 'border-red-500' : ''
                      }`}
                      placeholder="example@email.com"
                    />
                    {errors[`${recipient.id}-email`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`${recipient.id}-email`]}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-end items-center">
                  {savedRecipientIds.has(recipient.id) && (
                    <span className="text-green-600 text-sm font-semibold animate-fade-in">
                      保存済み
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(recipient)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(recipient.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAdd}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline text-lg flex items-center space-x-2"
            >
              <span className="text-2xl">＋</span>
              <span>通知先を追加</span>
            </button>
          </div>

          {recipients.length === 0 && (
            <div className="bg-white shadow rounded-lg p-8 text-center mt-6">
              <p className="text-gray-500 text-lg mb-4">通知先が登録されていません</p>
              <p className="text-gray-400 text-sm">「＋」ボタンから通知先を追加してください</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
