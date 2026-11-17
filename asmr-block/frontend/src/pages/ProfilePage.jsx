import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import LanguageSwitch from '../locales/LanguageSwitch';
import authApi from '../api/authApi';
import { errorMessage } from '../api/api';
import useAuthStore from '../store/authStore';
import WalletCard from '../components/coin/WalletCard';
import SleepWeek from '../components/sleep/SleepWeek';
import HiddenCreators from '../components/profile/HiddenCreators';

/** 내 정보: 닉네임 바꾸기 · 바로 가기 · 로그아웃 · 회원 탈퇴 */
function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, updateMe, logout } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const { hash } = useLocation();
  // "내 코인 보기"(/profile#coins)로 오면 코인 칸으로
  useEffect(() => {
    if (hash !== '#coins') return undefined;
    const timer = setTimeout(() => document.getElementById('coins')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => clearTimeout(timer);
  }, [hash]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateMe({ nickname: nickname.trim() });
    setSaving(false);
    if (result.success) toast.success(t('profile.saved')); else toast.error(t('profile.saveFailed'));
  };

  const leave = async () => {
    if (!window.confirm(t('profile.confirmLeave'))) return;
    try {
      await authApi.deleteMe();
      await logout();
      toast.success(t('profile.left'));
      navigate('/');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="page max-w-lg pt-10">
      <p className="eyebrow">{t('profile.eyebrow')}</p>
      <h1 className="text-3xl font-black">{user?.nickname}</h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Link to="/me/combos" className="btn-line text-center">{t('profile.myCombos')}</Link>
        <Link to="/sell#mine" className="btn-line text-center">{t('profile.uploads')}</Link>
        <Link to="/shop" className="btn-line text-center">{t('profile.shop')}</Link>
      </div>

      <WalletCard />
      <SleepWeek className="mt-4" />
      <HiddenCreators className="mt-4" />

      <form onSubmit={save} className="card mt-6 space-y-4 p-6">
        <label className="block"><span className="label">{t('profile.nickname')}</span>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} required />
        </label>
        <button type="submit" className="btn-pink w-full" disabled={saving}>{t('profile.save')}</button>
      </form>

      <div className="card mt-4 flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-bold">{t('profile.language')}</span>
        <LanguageSwitch />
      </div>
      <button type="button" className="btn-line mt-4 w-full" onClick={async () => { await logout(); navigate('/'); }}>{t('profile.logout')}</button>
      <button type="button" className="mt-4 w-full text-sm text-faint hover:text-danger" onClick={leave}>{t('profile.leave')}</button>
    </div>
  );
}

export default ProfilePage;
