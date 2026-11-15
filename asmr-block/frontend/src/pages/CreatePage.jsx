import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoCopy, IoMoon, IoTrash } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { errorMessage, libraryApi, playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import BetaLoginButton from '../components/common/BetaLoginButton';
import Board from '../components/editor/Board';
import BlockShelf, { DragGhost } from '../components/editor/BlockShelf';
import { useMixPreview, usePreviewClock } from '../components/editor/useMixPreview';
import { autoTitle, cycleLength, LISTEN_OPTIONS, mainLayout, MAX_TOTAL_SECONDS, toSaveRequest } from '../lib/editorLogic';
import { formatDuration, formatLength } from '../lib/blocks';
import useAuthStore from '../store/authStore';
import useEditorStore from '../store/editorStore';

/**
 * 조합 만들기 (웹): 앱과 같은 옆으로 누운 레고 블록 두 줄.
 * 왼쪽 바닥판 + 오른쪽 내 블록함 → 얼마나 들을까요 → 저장하면 완성본을 만들고 듣기 화면으로
 */
function CreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const editor = useEditorStore();
  const [ready, setReady] = useState(false);
  const [library, setLibrary] = useState(null);
  const [saving, setSaving] = useState(false);
  const preview = useMixPreview();
  const playing = usePreviewClock((s) => s.t !== null);

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
          <p className="text-xl font-extrabold">로그인하면 조합을 만들 수 있어요</p>
          <p className="text-sm text-muted">담은 블록을 레고처럼 이어 붙여서 나만의 ASMR을 만들어 보세요.</p>
          <BetaLoginButton className="w-full" />
          <div className="flex gap-2">
            <Link to="/login" state={{ from: '/create' }} className="btn-pink">로그인</Link>
            <Link to="/signup" className="btn-line">회원가입</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!ready) return <BlockLoader className="pt-24" label="조합을 불러오는 중" />;

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
    if (s.main.items.length === 0) return toast.info('첫째 줄에 블록을 1개 이상 놓아 주세요.');
    if (cycleLength(s) > MAX_TOTAL_SECONDS) return toast.info('한 바퀴는 최대 10시간이에요.');
    if ([...s.main.items, ...(s.mix.enabled ? s.mix.items : [])].some((i) => !i.block.owned)) {
      return toast.info('내 블록함에 없는 블록이 있어요. 블록 상점에서 담거나 그 블록을 빼 주세요.');
    }
    if (!s.title.trim()) s.setTitle(autoTitle(s));
    setSaving(true);
    try {
      const request = toSaveRequest(useEditorStore.getState());
      const saved = s.playlistId ? await playlistApi.update(s.playlistId, request) : await playlistApi.create(request);
      useEditorStore.getState().markSaved(saved.id);
      await playlistApi.requestRender(saved.id).catch(() => null);
      toast.success('저장했어요! 완성본을 만들고 있어요.');
      navigate(`/listen/${saved.id}`);
    } catch (e) {
      toast.error(errorMessage(e, '저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="page pt-6">
      {/* 이름 · 공개 · 저장 */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/me/combos" className="btn-ghost p-2" aria-label="내 조합으로"><IoArrowBack size={20} /></Link>
        <div className="min-w-0 flex-1 basis-60">
          <input className="w-full bg-transparent text-xl font-black sm:text-2xl tracking-tight outline-none placeholder:text-faint" value={editor.title}
            onChange={(e) => editor.setTitle(e.target.value)} placeholder={editor.playlistId ? '조합 이름' : '새 조합 (이름은 자동)'}
            maxLength={100} aria-label="조합 이름" data-testid="title-input" />
          <p className="mt-0.5 text-xs text-muted" data-testid="editor-meta">
            한 바퀴 {formatLength(cycle)} · 블록 {blockCount}개 · {editor.listenMinutes > 0 ? `${LISTEN_OPTIONS.find((o) => o.minutes === editor.listenMinutes)?.label} 반복` : '한 바퀴만'}
          </p>
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[#F7609A]" checked={editor.isPublic} onChange={(e) => editor.setIsPublic(e.target.checked)} />
          공개 <span className="hidden text-xs text-faint sm:inline">(추천 조합에 올라가요)</span>
        </label>
        <button type="button" className="btn-pink px-6" onClick={save} disabled={saving} data-testid="save">{saving ? '저장 중…' : '저장'}</button>
      </div>

      {/* 얼마나 들을까요 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1 text-sm font-bold text-muted"><IoMoon className="text-pink-text" /> 얼마나 들을까요?</span>
        {LISTEN_OPTIONS.map((o) => (
          <button key={o.minutes} type="button" className={`chip px-3 py-1 ${editor.listenMinutes === o.minutes ? 'chip-on' : ''}`}
            onClick={() => editor.setListenMinutes(o.minutes)}>{o.label}</button>
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
                  <button type="button" className="btn-line btn-sm" onClick={() => editor.nudge(selectedItem.key, -10)}>◀ 10초</button>
                  <button type="button" className="btn-line btn-sm" onClick={() => editor.nudge(selectedItem.key, 10)}>10초 ▶</button>
                </>
              )}
              <button type="button" className="btn-line btn-sm" onClick={() => editor.duplicate(selectedItem.key)} data-testid="dup"><IoCopy /> 복제</button>
              <button type="button" className="btn-line btn-sm hover:text-danger" onClick={() => editor.remove(selectedItem.key)} data-testid="remove"><IoTrash /> 빼기</button>
            </div>
          ) : (
            <p className="px-1 text-xs text-faint">블록을 누르면 <b className="text-muted">복제·빼기</b>, 끌면 <b className="text-muted">옮기기</b>. 블록함으로 끌어다 놓으면 빠져요.</p>
          )}
          {editor.mix.enabled && (
            <label className="flex items-center gap-3 px-1 text-xs text-muted">
              레이어드 소리 크기
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
