import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 레이아웃
import Header from './components/common/Header';

// 페이지
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PlaylistPage from './pages/PlaylistPage';
import EditorPage from './pages/EditorPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0f0f0f]">
        <Header />
        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/playlists" element={<PlaylistPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:playlistId" element={<EditorPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          theme="dark"
        />
      </div>
    </Router>
  );
}

export default App;
