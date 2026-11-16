import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoCopy, IoMoon, IoTrash } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { Trans, useTranslation } from 'react-i18next';
import { errorMessage, libraryApi, playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BetaLoginButton from '../components/common/BetaLoginButton';
import { useFirstRunGuide } from '../components/guide/GuideModal';
import Board from '../components/editor/Board';
import BlockShelf, { DragGhost } from '../components/editor/BlockShelf';
import { useMixPreview, usePreviewClock } from '../components/editor/useMixPreview';
import { autoTitle, cycleLength, LISTEN_OPTIONS, listenOptionLabel, mainLayout, MAX_TOTAL_SECONDS, toSaveRequest } from '../lib/editorLogic';
import { formatDuration, formatLength } from '../lib/blocks';
import useAuthStore from '../store/authStore';
import useEditorStore from '../store/editorStore';

/**
 * 조합 만들기 (웹): 앱과 같은 옆으로 누운 레고 블록 두 줄.
 * 왼쪽 바닥판 + 오른쪽 내 블록함 → 얼마나 들을까요 → 저장하면 완성본을 만들고 듣기 화면으로
 */
function CreatePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const editor = useEditorStore();
  const [ready, setReady] = useState(false);
  const [library, setLibrary] = useState(null);
  const [saving, setSaving] = useState(false);
  const preview = useMixPreview();
  const playing = usePreviewClock((s) => s.t !== null);
  // 편집기를 처음 열면 한 번: 끌어서 쌓는 법 (화면이 다 뜬 뒤에)
  useFirstRunGuide('editor', isAuthenticated && ready);

  // 처음 열 때 한 번: 새로 만들기 또는 저장된 조합 불러오기
  useEffect(() => {
    if (!isAuthenticated) return;
    setReady(false);
    if (!id) {
      useEditorStore.getState().initNew();
      setReady(true);
    } else {
      playlistApi.get(id).then((p) => { useEditorStore.getState().load(p); setReady(true); })
        .catch((e) => { toast.error(errorMessage(e)); navigate('/me/combos'); });
    }
    libraryApi.mine().then(setLibrary).catch(() => setLibrary([]));
  }, [id, isAuthenticated, navigate]);

  // 저장하지 않고 나가면 물어봄 + 선택한 블록은 Delete 키로 빼기
  useEffect(() => {
    const onUnload = (e) => { if (useEditorStore.getState().isModified) { e.preventDefault(); e.returnValue = ''; } };
    const onKey = (e) => {
      const s = useEditorStore.getState();
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selected && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) {
        e.preventDefault();
        s.remove(s.selected.key);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('beforeunload', onUnload); window.removeEventListener('keydown', onKey); };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="page pt-16">
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 p-10 text-center">
          <p className="text-xl font-extrabold">{t('create.loginTitle')}</p>
          <p className="text-sm text-muted">{t('create.loginBody')}</p>
          <BetaLoginButton className="w-full" />
          <div className="flex gap-2">
            <Link to="/login" state={{ from: '/create' }} className="btn-pink">{t('create.login')}</Link>
            <Link to="/signup" className="btn-line">{t('create.signup')}</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!ready) return <BlockLoader className="pt-24" label={t('create.loading')} />;

  const cycle = cycleLength(editor);
  const blockCount = editor.main.items.length + (editor.mix.enabled ? editor.mix.items.length : 0);
  const selectedItem = editor.selected
    && (editor.selected.row === 'main' ? editor.main.items : editor.mix.items).find((i) => i.key === editor.selected.key);

  const startFrom = () => {
    const sel = editor.selected;
    if (!sel) return 0;
    if (sel.row === 'mix') return editor.mix.items.find((i) => i.key === sel.key)?.start ?? 0;
    return mainLayout(editor.main.items).find((l) => l.key === sel.key)?.start ?? 0;
  };

  const save = async () => {
    preview.stop();
    const s = useEditorStore.getState();
    if (s.main.items.length === 0) return toast.info(t('create.needBlock'));
    if (cycleLength(s) > MAX_TOTAL_SECONDS) return toast.info(t('create.tooLong'));
    if ([...s.main.items, ...(s.mix.enabled ? s.mix.items : [])].some((i) => !i.block.owned)) {
      return toast.info(t('create.notOwned'));
    }
    if (!s.title.trim()) s.setTitle(autoTitle(s));
    setSaving(true);
    try {
      const request = toSaveRequest(useEditorStore.getState());
      const saved = s.playlistId ? await playlistApi.update(s.playlistId, request) : await playlistApi.create(request);
      useEditorStore.getState().markSaved(saved.id);
      await playlistApi.requestRender(saved.id).catch(() => null);
      toast.success(t('create.saved'));
      navigate(`/listen/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, t('create.saveFailed')));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="page pt-6">
      {/* 이름 · 공개 · 저장 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/me/combos" className="btn-ghost p-2" aria-label={t('create.back')}><IoArrowBack size={20} /></Link>
        <div className="min-w-0 flex-1 basis-60">
          <input className="w-full bg-transparent text-xl font-black sm:text-2xl tracking-tight outline-none placeholder:text-faint" value={editor.title}
            onChange={(e) => editor.setTitle(e.target.value)} placeholder={editor.playlistId ? t('create.namePh') : t('create.newPh')}
            maxLength={100} aria-label={t('create.namePh')} data-testid="title-input" />
          <p className="mt-0.5 text-xs text-muted" data-testid="editor-meta">
            {t('common.loop', { length: formatLength(cycle) })} · {t('common.blocks', { count: blockCount })} · {editor.listenMinutes > 0 ? t('common.repeat', { time: listenOptionLabel(editor.listenMinutes) }) : t('time.onceOnly')}
          </p>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[#F7609A]" checked={editor.isPublic} onChange={(e) => editor.setIsPublic(e.target.checked)} />
          {t('create.public')} <span className="hidden text-xs text-faint sm:inline">{t('create.publicHint')}</span>
        </label>
        <button type="button" className="btn-pink px-6" onClick={save} disabled={saving} data-testid="save">{saving ? t('create.saving') : t('create.save')}</button>
      </div>

      {/* 얼마나 들을까요 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1 text-sm font-bold text-muted"><IoMoon className="text-pink-text" /> {t('create.howLong')}</span>
        {LISTEN_OPTIONS.map((o) => (
          <button key={o.minutes} type="button" className={`chip px-3 py-1 ${editor.listenMinutes === o.minutes ? 'chip-on' : ''}`}
            onClick={() => editor.setListenMinutes(o.minutes)}>{listenOptionLabel(o.minutes)}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <Board playing={playing} onTogglePlay={() => (playing ? preview.stop() : preview.start(startFrom()))} />

          {/* 고른 블록 */}
          {selectedItem ? (
            <div className="card flex flex-wrap items-center gap-2 p-3" data-testid="action-bar">
              <span className="mr-auto truncate text-sm"><b>{selectedItem.block.title}</b> <span className="text-faint">{formatDuration(selectedItem.block.duration)}</span></span>
              {editor.selected.row === 'mix' && (
                <>
                  <button type="button" className="btn-line btn-sm" onClick={() => editor.nudge(selectedItem.key, -10)}>{t('create.back10')}</button>
                  <button type="button" className="btn-line btn-sm" onClick={() => editor.nudge(selectedItem.key, 10)}>{t('create.fwd10')}</button>
                </>
              )}
              <button type="button" className="btn-line btn-sm" onClick={() => editor.duplicate(selectedItem.key)} data-testid="dup"><IoCopy /> {t('create.dup')}</button>
              <button type="button" className="btn-line btn-sm hover:text-danger" onClick={() => editor.remove(selectedItem.key)} data-testid="remove"><IoTrash /> {t('create.remove')}</button>
            </div>
          ) : (
            <p className="px-1 text-xs text-faint"><Trans i18nKey="create.hint" components={{ b: <b className="text-muted" /> }} /></p>
          )}
          {editor.mix.enabled && (
            <label className="flex items-center gap-3 px-1 text-xs text-muted">
              {t('create.layerVolume')}
              <input type="range" min={0} max={100} value={Math.round(editor.mix.volume * 100)} className="w-40 accent-[#F7609A]"
                onChange={(e) => editor.setMixVolume(Number(e.target.value) / 100)} />
              {Math.round(editor.mix.volume * 100)}%
            </label>
          )}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start"><BlockShelf library={library} /></div>
      </div>
      <DragGhost />
    </div>
  );
}

export default CreatePage;
