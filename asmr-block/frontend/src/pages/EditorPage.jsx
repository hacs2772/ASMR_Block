import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import blockApi from '../api/blockApi';
import playlistApi from '../api/playlistApi';
import useEditorStore from '../store/editorStore';
import useAuthStore from '../store/authStore';
import BlockList from '../components/block/BlockList';
import TwinTowerEditor from '../components/playlist/TwinTowerEditor';
import RenderPlayer from '../components/playlist/RenderPlayer';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

function EditorPage() {
  const { t } = useTranslation(['playlist', 'common']);
  const { playlistId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    title, setTitle, description, setDescription, isPublic, setIsPublic,
    main, activeTower, addBlock, initNew, loadPlaylist, toRequest, markSaved,
    isModified, isSaving, setSaving,
  } = useEditorStore();

  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [render, setRender] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [blockRes, playlistRes] = await Promise.all([
          blockApi.getBlocks({ size: 100 }),
          playlistId ? playlistApi.getPlaylist(playlistId) : Promise.resolve(null),
        ]);
        setAvailableBlocks(blockRes.data?.content || []);
        if (playlistRes) {
          loadPlaylist(playlistRes.data);
          setRender(playlistRes.data.render);
        } else {
          initNew();
          setRender(null);
        }
      } catch (error) {
        toast.error(t('common:message.error'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, playlistId, navigate, loadPlaylist, initNew, t]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('validation.title'));
      return;
    }
    if (main.blocks.length === 0) {
      toast.error(t('validation.mainEmpty'));
      return;
    }
    setSaving(true);
    try {
      const res = playlistId
        ? await playlistApi.updatePlaylist(playlistId, toRequest())
        : await playlistApi.createPlaylist(toRequest());
      markSaved(res.data.id);
      setRender(res.data.render);
      toast.success(t('saveSuccess'));
      if (!playlistId) navigate(`/editor/${res.data.id}`, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.error?.message || t('common:message.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlock = (block) => {
    addBlock(block);
    toast.success(t('tower.added', { tower: t(`tower.${activeTower}`), title: block.title }), { autoClose: 1200 });
  };

  if (loading) return <Loading />;

  return (
    <div className="pb-32">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/playlists')} className="text-gray-400 hover:text-white" aria-label="back">
            <FiArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">{playlistId ? t('edit') : t('create')}</h1>
        </div>
        <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={!isModified && !!playlistId}>
          <FiSave size={18} />
          {t('common:button.save')}
        </Button>
      </div>

      {/* 제목/설명 */}
      <div className="card mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="input-field" placeholder={t('placeholder.title')} maxLength={100} />
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="input-field" placeholder={t('placeholder.description')} maxLength={1000} />
        </div>
        <label className="mt-4 flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-gray-400">{t('visibility.public')}</span>
        </label>
      </div>

      {/* 블록 고르기 + 쌍둥이 빌딩 */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <h2 className="text-lg font-medium text-white mb-1">{t('editor.blocks')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('editor.addHint', { tower: t(`tower.${activeTower}`) })}</p>
          <div className="max-h-[720px] overflow-y-auto pr-1">
            <BlockList
              blocks={availableBlocks}
              onAddBlock={handleAddBlock}
              showAddButton
              gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2"
            />
          </div>
        </div>
        <div className="lg:sticky lg:top-4 self-start">
          <TwinTowerEditor />
        </div>
      </div>

      <RenderPlayer playlistId={playlistId ? Number(playlistId) : null} initialRender={render} isModified={isModified} />
    </div>
  );
}

export default EditorPage;
