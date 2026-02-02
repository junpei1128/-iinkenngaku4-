import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { checkBackendConnection } from '../utils/backend-check';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // アプリケーション起動時にバックエンド接続を確認
  useEffect(() => {
    // ログインページ以外で接続チェックを実行
    if (location.pathname !== '/login') {
      checkBackendConnection();
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isReportsActive = () => {
    return location.pathname === '/reports';
  };

  const isNewReportActive = () => {
    return location.pathname === '/reports/new';
  };

  const navLinkClass = (active: boolean) =>
    `block px-3 py-2 text-base font-medium rounded-md ${
      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-base sm:text-xl font-bold text-gray-900">歯科医院見学レポート</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/reports/new"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isNewReportActive()
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  新規作成
                </Link>
                <Link
                  to="/reports"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isReportsActive()
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  レポート一覧
                </Link>
                <Link
                  to="/recipients"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/recipients')
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  通知先登録
                </Link>
              </div>
            </div>
            <div className="flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded={mobileMenuOpen}
                aria-label="メニューを開く"
              >
                <span className="sr-only">メニューを開く</span>
                {mobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200 px-4">
            <div className="pt-2 pb-3 flex flex-col space-y-1">
              <Link
                to="/reports/new"
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass(isNewReportActive())}
              >
                新規作成
              </Link>
              <Link
                to="/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass(isReportsActive())}
              >
                レポート一覧
              </Link>
              <Link
                to="/recipients"
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass(isActive('/recipients'))}
              >
                通知先登録
              </Link>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
