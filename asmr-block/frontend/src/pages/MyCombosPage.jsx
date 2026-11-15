import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { IoCreate, IoPlay, IoTrash } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { errorMessage, playlistApi } from '../api/api';
import BlockLoader from '../components/brand/BlockLoader';
import AssembleButton from '../components/home/AssembleButton';
import { ComboBricks } from '../components/playlist/ComboCard';
import { formatLength, listenLabel } from '../lib/blocks';
import useAuthStore from '../store/authStore';

/** 내 조합: 바로 듣기 · 블록 편집 · 삭제 */
function MyCombosPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [combos, setCombos] = useState(null);
  const load = () => playlistApi.mine().then((p) => setCombos(p.content)).catch(() => setCombos([]));
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated]);
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const remove = async (c) => {
    if (!window.confirm(`'${c.title}' 조합을 삭제할까요?`)) return;
    try { await playlistApi.remove(c.id); toast.success('삭제했어요'); load(); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="page pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">바로 듣기</p><h1 className="text-3xl font-black tracking-tight">내 조합</h1></div>
        <AssembleButton label="새 조합 만들기" />
      </div>
      <div className="mt-8">
        {combos === null ? <BlockLoader /> : combos.length === 0 ? (
          <p className="card p-8 text-center text-muted">아직 만든 조합이 없어요. 블록을 쌓거나 추천 조합을 한 번에 담아 오세요.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {combos.map((c) => (
              <div key={c.id} className="card flex items-center gap-3 p-4 sm:gap-4" data-testid={`my-combo-${c.id}`}>
                <Link to={`/listen/${c.id}`} className="w-16 shrink-0 sm:w-24"><ComboBricks colors={c.previewColors} hasMix={c.hasMix} /></Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/listen/${c.id}`} className="block truncate font-bold hover:text-pink-text">{c.title}</Link>
                  <p className="mt-1 truncate text-xs text-muted">
                    {formatLength(c.totalDuration)} · 블록 {c.blockCount}개{c.hasMix ? ' · 레이어드' : ''}
                    {c.listenMinutes > 0 ? ` · ${listenLabel(c.listenMinutes)}` : ''} · {c.collect?.sourceOwner ? `@${c.collect.sourceOwner.nickname} 조합` : c.isPublic ? '공개' : '비공개'}
                  </p>
                  {/* 핸드폰: 편집·삭제는 제목 아래 작은 글자로 (제목 자리를 넓게) */}
                  <div className="mt-2 flex gap-4 text-xs font-semibold text-muted sm:hidden">
                    <Link to={`/create/${c.id}`} className="flex items-center gap-1 hover:text-ink"><IoCreate size={14} /> 블록 편집</Link>
                    <button type="button" className="flex items-center gap-1 hover:text-danger" onClick={() => remove(c)}><IoTrash size={13} /> 삭제</button>
                  </div>
                </div>
                <Link to={`/create/${c.id}`} className="btn-ghost hidden p-2 sm:inline-flex" aria-label="블록 편집"><IoCreate size={18} /></Link>
                <button type="button" className="btn-ghost hidden p-2 hover:text-danger sm:inline-flex" onClick={() => remove(c)} aria-label="삭제"><IoTrash size={17} /></button>
                <Link to={`/listen/${c.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-white" aria-label="듣기"><IoPlay className="ml-0.5" /></Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyCombosPage;
