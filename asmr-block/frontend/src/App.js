import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import 'react-toastify/dist/ReactToastify.css';

import { VideoModal } from './components/block/VideoModal';
import { ComingSoonModal } from './components/common/ComingSoon';
import { FeedbackFab, FeedbackModal } from './components/common/Feedback';
import { ReportModal } from './components/common/Report';
import { BuyModal } from './components/coin/BuyModal';
import { InstallModal, listenInstallPrompt } from './components/common/Install';
import Footer from './components/common/Footer';
import { GuideModal } from './components/guide/GuideModal';
import Header from './components/common/Header';
import AdminPage from './pages/AdminPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import { DeleteAccountPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import CombosPage from './pages/CombosPage';
import CreatePage from './pages/CreatePage';
import GuidePage from './pages/GuidePage';
import HomePage from './pages/HomePage';
import ListenPage from './pages/ListenPage';
import MyCombosPage from './pages/MyCombosPage';
import ProfilePage from './pages/ProfilePage';
import SellPage from './pages/SellPage';
import CreatorPage from './pages/CreatorPage';
import RecordingGuidePage from './pages/RecordingGuidePage';
import ShopPage from './pages/ShopPage';
import useAuthStore from './store/authStore';

/** 화면을 옮기면 맨 위부터 (#내용으로 가는 링크는 그대로) */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}

/** 예전 주소(/editor/3)로 들어와도 새 주소로 */
function EditorRedirect() {
  const { playlistId } = useParams();
  return <Navigate to={playlistId ? `/create/${playlistId}` : '/create'} replace />;
}

/**
 * 언어를 바꾸면 화면을 새로 그려서 서버 글(블록·조합 이름, 트리거 이름, 오류 문장)을 새 언어로 다시 받음.
 * 하던 것이 있는 화면(편집기·듣기·블록 판매·관리자)은 그대로 두고 그 화면이 useLangChange로 필요한 것만 다시 받음
 */
const KEEP_ON_LANG_CHANGE = /^\/(create|listen|sell|admin)(\/|$)/;
function LangKeyed({ children }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  return <React.Fragment key={KEEP_ON_LANG_CHANGE.test(pathname) ? 'keep' : i18n.language}>{children}</React.Fragment>;
}

listenInstallPrompt();

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-night">
        <Header />
        <main className="flex-1">
          <LangKeyed>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/combos" element={<CombosPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/create/:id" element={<CreatePage />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/sell/guide" element={<RecordingGuidePage />} />
            <Route path="/creator/:id" element={<CreatorPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/listen/:id" element={<ListenPage />} />
            <Route path="/me/combos" element={<MyCombosPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/delete-account" element={<DeleteAccountPage />} />
            {/* 예전 주소 */}
            <Route path="/explore" element={<Navigate to="/shop" replace />} />
            <Route path="/playlists" element={<Navigate to="/me/combos" replace />} />
            <Route path="/editor" element={<EditorRedirect />} />
            <Route path="/editor/:playlistId" element={<EditorRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </LangKeyed>
        </main>
        <Footer />
        <ComingSoonModal />
        <VideoModal />
        <FeedbackModal />
        <ReportModal />
        <BuyModal />
        <InstallModal />
        <GuideModal />
        <FeedbackFab />
        <ToastContainer position="bottom-center" autoClose={2800} hideProgressBar theme="dark" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </Router>
  );
}

export default App;
