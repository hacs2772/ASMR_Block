import React, { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { VideoModal } from './components/block/VideoModal';
import { ComingSoonModal } from './components/common/ComingSoon';
import Footer from './components/common/Footer';
import Header from './components/common/Header';
import AdminPage from './pages/AdminPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import CombosPage from './pages/CombosPage';
import CreatePage from './pages/CreatePage';
import GuidePage from './pages/GuidePage';
import HomePage from './pages/HomePage';
import ListenPage from './pages/ListenPage';
import MyCombosPage from './pages/MyCombosPage';
import ProfilePage from './pages/ProfilePage';
import SellPage from './pages/SellPage';
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

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => { fetchMe(); }, [fetchMe]);

  return (
    <Router>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col bg-night">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/combos" element={<CombosPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/create/:id" element={<CreatePage />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/listen/:id" element={<ListenPage />} />
            <Route path="/me/combos" element={<MyCombosPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* 예전 주소 */}
            <Route path="/explore" element={<Navigate to="/shop" replace />} />
            <Route path="/playlists" element={<Navigate to="/me/combos" replace />} />
            <Route path="/editor" element={<EditorRedirect />} />
            <Route path="/editor/:playlistId" element={<EditorRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
        <ComingSoonModal />
        <VideoModal />
        <ToastContainer position="bottom-center" autoClose={2800} hideProgressBar theme="dark" />
      </div>
    </Router>
  );
}

export default App;
