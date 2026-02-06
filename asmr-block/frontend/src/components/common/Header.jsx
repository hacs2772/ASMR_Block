import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMusic, FiSearch, FiList, FiUser, FiLogOut } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import LanguageSelector from './LanguageSelector';

function Header() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <FiMusic className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">ASMR Block</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/explore"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <FiSearch size={18} />
              <span>{t('header.explore')}</span>
            </Link>
            
            {isAuthenticated && (
              <Link
                to="/playlists"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiList size={18} />
                <span>{t('header.myPlaylist')}</span>
              </Link>
            )}
          </nav>

          {/* 우측 메뉴 */}
          <div className="flex items-center gap-4">
            <LanguageSelector />
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <FiUser size={18} />
                  <span className="hidden sm:inline">{user?.nickname}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <FiLogOut size={18} />
                  <span className="hidden sm:inline">{t('header.logout')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('header.login')}
                </Link>
                <Link
                  to="/signup"
                  className="btn-primary"
                >
                  {t('header.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
