import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import blockApi from '../api/blockApi';
import playlistApi from '../api/playlistApi';
import useEditorStore from '../store/editorStore';
import useAuthStore from '../store/authStore';
import BlockList from '../components/block/BlockList';
import PlaylistEditor from '../components/playlist/PlaylistEditor';
import PlaylistPlayer from '../components/playlist/PlaylistPlayer';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

function EditorPage() {
  const { t } = useTranslation(['playlist', 'common']);
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  const {
    title, setTitle, description, setDescription, isPublic, setIsPublic,
    blocks, addBlock, initNew, loadPlaylist, getPlaylistData, isModified, isSaving, setSaving,
  } = useEditorStore();

  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, playlistId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 블록 목록 로드
      const blockRes = await blockApi.getBlocks({ size: 50 });
      setAvailableBlocks(blockRes.data?.content || []);

      // 기존 플레이리스트 로드 또는 새로 만들기
      if (playlistId) {
        const playlistRes = await playlistApi.getPlaylist(playlistId);
        loadPlaylist(playlistRes.data);
      } else {
        initNew();
      }
    } catch (error) {
      toast.error(t('common:message.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (blocks.length === 0) {
      toast.error('블록을 1개 이상 추가해주세요.');
      return;
    }

    setSaving(true);
    try {
      const data = getPlaylistData();
      if (playlistId) {
        await playlistApi.updatePlaylist(playlistId, data);
      } else {
        await playlistApi.createPlaylist(data);
      }
      toast.success(t('saveSuccess'));
      navigate('/playlists');
    } catch (error) {
      toast.error(t('common:message.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = (block) => {
    addBlock(block);
    toast.success(`"${block.title}" 추가됨`);
  };

  if (loading) return <Loading />;

  return (
    <div className="pb-32">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/playlists')} className="text-gray-400 hover:text-white">
            <FiArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">
            {playlistId ? t('edit') : t('create')}
          </h1>
        </div>
        <Button variant="primary" onClick={handleSave} loading={isSaving}>
          <FiSave size={18} />
          {t('common:button.save')}
        </Button>
      </div>

      {/* 제목/설명 입력 */}
      <div className="card mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('placeholder.title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder={t('placeholder.title')}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">{t('placeholder.description')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder={t('placeholder.description')}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-gray-400">{t('visibility.public')}</span>
          </label>
        </div>
      </div>

      {/* 에디터 영역 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 블록 선택 */}
        <div>
          <h2 className="text-lg font-medium text-white mb-4">{t('editor.blocks')}</h2>
          <BlockList blocks={availableBlocks} onAddBlock={handleAddBlock} showAddButton={true} />
        </div>

        {/* 내 조합 */}
        <div>
          <h2 className="text-lg font-medium text-white mb-4">{t('editor.myBlocks')}</h2>
          <PlaylistEditor />
        </div>
      </div>

      {/* 플레이어 */}
      {blocks.length > 0 && <PlaylistPlayer blocks={blocks} />}
    </div>
  );
}

export default EditorPage;
