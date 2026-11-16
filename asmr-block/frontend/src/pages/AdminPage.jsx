import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { IoBarChart, IoChatbubbles, IoColorPalette, IoFlag, IoHappy, IoShieldCheckmark, IoWallet } from 'react-icons/io5';
import BlockReview from '../components/admin/BlockReview';
import CategoryManager from '../components/admin/CategoryManager';
import CoinManager from '../components/admin/CoinManager';
import FeedbackList from '../components/admin/FeedbackList';
import ReportList from '../components/admin/ReportList';
import StatsPanel from '../components/admin/StatsPanel';
import StickerManager from '../components/admin/StickerManager';
import { adminApi } from '../api/api';
import useAuthStore from '../store/authStore';

const TABS = [
  { key: 'stats', label: '통계', icon: IoBarChart },
  { key: 'review', label: '블록 승인', icon: IoShieldCheckmark },
  { key: 'reports', label: '신고', icon: IoFlag },
  { key: 'feedback', label: '의견', icon: IoChatbubbles },
  { key: 'categories', label: '트리거 종류', icon: IoColorPalette },
  { key: 'stickers', label: '스티커', icon: IoHappy },
  { key: 'coins', label: '코인', icon: IoWallet },
];

/** 관리자 페이지: 관리자 계정으로 로그인했을 때만 (서버도 ADMIN 권한을 다시 확인) */
function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('adminTab') || 'stats'; } catch { return 'stats'; }
  });
  const [pending, setPending] = useState(null);
  const [newFeedback, setNewFeedback] = useState(null);
  const [openReports, setOpenReports] = useState(null);
  // 처음 들어오면 배지 숫자(승인 대기·새 신고·새 의견)를 한 번 받아 둠
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    adminApi.stats().then((s) => {
      setPending(s.content.pendingBlocks);
      setNewFeedback(s.newFeedback);
      setOpenReports(s.openReports);
    }).catch(() => {});
  }, [user?.role]);

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: '/admin' }} replace />;
  if (user && user.role !== 'ADMIN') {
    return (
      <div className="page pt-16">
        <div className="card mx-auto max-w-md p-10 text-center">
          <p className="text-xl font-extrabold">관리자만 볼 수 있어요</p>
          <p className="mt-2 text-sm text-muted">관리자 계정으로 로그인해 주세요.</p>
          <Link to="/" className="btn-line mt-6">홈으로</Link>
        </div>
      </div>
    );
  }
  const choose = (key) => {
    setTab(key);
    try { sessionStorage.setItem('adminTab', key); } catch { /* 저장 못 해도 괜찮음 */ }
  };

  return (
    <div className="page pb-20 pt-10">
      <p className="eyebrow">관리자</p>
      <h1 className="text-3xl font-black tracking-tight">관리자 페이지</h1>
      <p className="mt-2 text-sm text-muted">베타 반응(숫자·의견)을 보고, 판매자가 올린 블록·신고와 트리거 종류·스티커를 관리해요. 여기서 바꾸면 앱·웹에 바로 보여요.</p>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => choose(t.key)} data-testid={`admin-tab-${t.key}`}
            className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-bold ${tab === t.key ? 'text-ink' : 'text-muted hover:text-ink'}`}>
            <t.icon className={tab === t.key ? 'text-pink-text' : ''} /> {t.label}
            {t.key === 'review' && pending > 0 && <span className="rounded-full bg-pink px-1.5 text-[11px] text-white" data-testid="pending-count">{pending}</span>}
            {t.key === 'reports' && openReports > 0 && <span className="rounded-full bg-pink px-1.5 text-[11px] text-white" data-testid="report-count">{openReports}</span>}
            {t.key === 'feedback' && newFeedback > 0 && <span className="rounded-full bg-pink px-1.5 text-[11px] text-white" data-testid="feedback-count">{newFeedback}</span>}
            {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-pink" />}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'stats' && <StatsPanel onOpenFeedback={() => choose('feedback')} onOpenReports={() => choose('reports')} />}
        {tab === 'review' && <BlockReview onPendingCount={setPending} />}
        {tab === 'reports' && <ReportList onOpenCount={setOpenReports} />}
        {tab === 'feedback' && <FeedbackList onNewCount={setNewFeedback} />}
        {tab === 'categories' && <CategoryManager />}
        {tab === 'stickers' && <StickerManager />}
        {tab === 'coins' && <CoinManager />}
      </div>
    </div>
  );
}

export default AdminPage;
