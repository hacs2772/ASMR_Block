import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { IoClose, IoMenu, IoPersonCircle, IoShieldCheckmark, IoStar } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import LanguageSwitch from '../../locales/LanguageSwitch';
import useAuthStore from '../../store/authStore';
import LogoMark from '../brand/LogoMark';
import { useComingSoon } from './ComingSoon';
import NotificationBell from './Notifications';

/** 큰 메뉴: 앱과 같은 순서 (블록 구매 · 추천 조합 · 조합 만들기 · 블록 판매) + 팅글 가이드 */
export const NAV = [
  { to: '/shop', labelKey: 'nav.shop' },
  { to: '/combos', labelKey: 'nav.combos', star: true },
  { to: '/create', labelKey: 'nav.create', strong: true },
  { to: '/sell', labelKey: 'nav.sell' },
  { to: '/guide', labelKey: 'nav.guide' },
];

export function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={t('nav.home')}>
      <LogoMark size={34} />
      <span className="font-display text-[22px] leading-none">ASMR <span className="text-pink-text">Block</span></span>
    </Link>
  );
}

function Header() {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const openApp = useComingSoon((s) => s.open);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  // 관리자 계정으로 로그인했을 때만 "관리자" 메뉴
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  // 다른 화면으로 가면 메뉴 닫기
  useEffect(() => { setMenuOpen(false); setUserOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!userOpen) return undefined;
    const onDown = (e) => { if (!userRef.current?.contains(e.target)) setUserOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${
      isActive ? 'text-ink' : 'text-muted hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-night/90 backdrop-blur">
      <div className="page flex h-16 items-center gap-4">
        <Logo />

        <nav className="ml-4 hidden items-center lg:flex" aria-label={t('nav.main')}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} data-testid={`nav-${item.to.slice(1)}`}>
              {({ isActive }) => (
                <>
                  {item.star && <IoStar size={12} className="text-pink-text" />}
                  <span className={item.strong ? 'text-pink-text' : undefined}>{t(item.labelKey)}</span>
                  {isActive && <span className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-pink" />}
                </>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass} data-testid="nav-admin">
              {({ isActive }) => (
                <>
                  <IoShieldCheckmark size={14} className="text-pink-text" /> {t('nav.admin')}
                  {isActive && <span className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-pink" />}
                </>
              )}
            </NavLink>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch compact className="hidden sm:flex" />
          <button type="button" className="btn-line btn-sm hidden whitespace-nowrap sm:inline-flex" onClick={() => openApp('app')} data-testid="header-get-app">
            {t('nav.getApp')}
          </button>
          {isAuthenticated && <NotificationBell />}
          {isAuthenticated ? (
            <div className="relative" ref={userRef}>
              <button type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:text-ink"
                onClick={() => setUserOpen((v) => !v)} aria-expanded={userOpen} data-testid="user-menu">
                <IoPersonCircle size={26} className="text-pink-text" />
                <span className="hidden max-w-[8rem] truncate sm:inline">{user?.nickname}</span>
              </button>
              {userOpen && (
                <div className="card absolute right-0 top-12 w-48 overflow-hidden py-1 shadow-2xl">
                  <MenuLink to="/me/combos">{t('nav.myCombos')}</MenuLink>
                  <MenuLink to="/sell#mine">{t('nav.myUploads')}</MenuLink>
                  {user?.id && <MenuLink to={`/creator/${user.id}`}>{t('nav.myCreatorPage')}</MenuLink>}
                  <MenuLink to="/profile">{t('nav.profile')}</MenuLink>
                  {isAdmin && <MenuLink to="/admin">{t('nav.adminPage')}</MenuLink>}
                  <button type="button" onClick={handleLogout} className="block w-full px-4 py-2.5 text-left text-sm text-muted hover:bg-card-active hover:text-ink">
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm hidden whitespace-nowrap sm:inline-flex">{t('nav.login')}</Link>
              <Link to="/login" className="btn-pink btn-sm whitespace-nowrap" data-testid="header-start">{t('nav.start')}</Link>
            </>
          )}
          <button type="button" className="btn-ghost p-2 lg:hidden" onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={menuOpen} data-testid="menu-toggle">
            {menuOpen ? <IoClose size={24} /> : <IoMenu size={24} />}
          </button>
        </div>
      </div>

      {/* 휴대폰: 펼치는 메뉴 */}
      {menuOpen && (
        <nav className="border-t border-line bg-night lg:hidden" aria-label={t('nav.main')}>
          <div className="page flex flex-col py-2">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `flex items-center gap-2 rounded-lg px-2 py-3 text-base font-semibold ${isActive ? 'text-ink' : 'text-muted'}`}>
                {item.star && <IoStar size={13} className="text-pink-text" />}
                <span className={item.strong ? 'text-pink-text' : undefined}>{t(item.labelKey)}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" data-testid="mobile-nav-admin"
                className={({ isActive }) => `flex items-center gap-2 rounded-lg px-2 py-3 text-base font-semibold ${isActive ? 'text-ink' : 'text-muted'}`}>
                <IoShieldCheckmark size={14} className="text-pink-text" /> {t('nav.admin')}
              </NavLink>
            )}
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              <button type="button" className="btn-line flex-1" onClick={() => openApp('app')}>{t('nav.getApp')}</button>
              {!isAuthenticated && <Link to="/login" className="btn-line flex-1">{t('nav.login')}</Link>}
            </div>
            <LanguageSwitch className="mt-3 justify-center" />
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuLink({ to, children }) {
  return <Link to={to} className="block px-4 py-2.5 text-sm text-muted hover:bg-card-active hover:text-ink">{children}</Link>;
}

export default Header;
