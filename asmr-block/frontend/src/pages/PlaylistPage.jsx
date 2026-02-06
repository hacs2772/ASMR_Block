import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiPlay, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import playlistApi from '../api/playlistApi';
import useAuthStore from '../store/authStore';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { formatDuration } from '../utils/formatTime';

function PlaylistPage() {
  const { t } = useTranslation(['playlist', 'common']);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadPlaylists();
  }, [isAuthenticated, navigate]);

  const loadPlaylists = async () => {
    try {
      const response = await playlistApi.getMyPlaylists();
      setPlaylists(response.data?.content || []);
    } catch (error) {
      toast.error(t('common:message.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playlistId, title) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await playlistApi.deletePlaylist(playlistId);
      toast.success(t('deleteSuccess'));
      loadPlaylists();
    } catch (error) {
      toast.error(t('common:message.error'));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="pb-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <Link to="/editor">
          <Button variant="primary">
            <FiPlus size={18} />
            {t('create')}
          </Button>
        </Link>
      </div>

      {playlists.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🎵</div>
          <p className="text-gray-400 mb-2">{t('empty')}</p>
          <p className="text-gray-500 text-sm mb-6">{t('emptyHint')}</p>
          <Link to="/editor">
            <Button variant="primary">
              <FiPlus size={18} />
              {t('create')}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="card hover:border-gray-700 transition-colors">
              {/* 블록 미리보기 */}
              <div className="flex gap-1 mb-3">
                {(playlist.previewBlocks || []).slice(0, 6).map((block, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: block.color || '#666' }}
                  />
                ))}
                {playlist.blockCount > 6 && (
                  <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                    +{playlist.blockCount - 6}
                  </div>
                )}
              </div>

              <h3 className="font-medium text-white mb-1">{playlist.title}</h3>
              <p className="text-sm text-gray-400 mb-3">
                {playlist.blockCount} {t('blockCount')} • {formatDuration(playlist.totalDuration)}
              </p>

              <div className="flex gap-2">
                <Link to={`/editor/${playlist.id}`} className="flex-1">
                  <Button variant="secondary" className="w-full" size="sm">
                    <FiPlay size={16} />
                    {t('common:button.play')}
                  </Button>
                </Link>
                <Link to={`/editor/${playlist.id}`}>
                  <Button variant="ghost" size="sm">
                    <FiEdit2 size={16} />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(playlist.id, playlist.title)}>
                  <FiTrash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlaylistPage;
