import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authApi from '../api/authApi';
import { errorMessage } from '../api/api';
import useAuthStore from '../store/authStore';

/** 내 정보: 닉네임 바꾸기 · 바로 가기 · 로그아웃 · 회원 탈퇴 */
function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateMe, logout } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateMe({ nickname: nickname.trim() });
    setSaving(false);
    if (result.success) toast.success('저장했어요'); else toast.error('저장하지 못했어요');
  };

  const leave = async () => {
    if (!window.confirm('정말 탈퇴할까요? 내 조합이 모두 삭제되고 되돌릴 수 없어요.')) return;
    try {
      await authApi.deleteMe();
      await logout();
      toast.success('탈퇴 처리되었어요.');
      navigate('/');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="page max-w-lg pt-10">
      <p className="eyebrow">내 정보</p>
      <h1 className="text-3xl font-black">{user?.nickname}</h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Link to="/me/combos" className="btn-line">내 조합</Link>
        <Link to="/sell#mine" className="btn-line">올린 블록</Link>
        <Link to="/shop" className="btn-line">블록 상점</Link>
      </div>

      <form onSubmit={save} className="card mt-6 space-y-4 p-6">
        <label className="block"><span className="label">닉네임</span>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} required />
        </label>
        <button type="submit" className="btn-pink w-full" disabled={saving}>저장</button>
      </form>

      <button type="button" className="btn-line mt-4 w-full" onClick={async () => { await logout(); navigate('/'); }}>로그아웃</button>
      <button type="button" className="mt-4 w-full text-sm text-faint hover:text-danger" onClick={leave}>회원 탈퇴</button>
    </div>
  );
}

export default ProfilePage;
