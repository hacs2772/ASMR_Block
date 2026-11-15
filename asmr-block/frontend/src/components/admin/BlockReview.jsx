import React, { useCallback, useEffect, useState } from 'react';
import { IoCheckmarkCircle, IoFilm, IoReturnUpBack } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import { colorOf, formatDuration, iconOf, noteOf, TALK_LABEL } from '../../lib/blocks';
import BlockLoader from '../brand/BlockLoader';
import Brick from '../brand/Brick';
import { useVideoModal } from '../block/VideoModal';

const TABS = [
  { status: 'PENDING', label: '승인 대기' },
  { status: 'APPROVED', label: '승인됨' },
  { status: 'REJECTED', label: '돌려보냄' },
];
/** 돌려보낼 때 자주 쓰는 이유 (눌러서 바로 넣기) */
const QUICK_REASONS = ['소리가 너무 작거나 커요', '음악·남의 소리가 섞였어요', '잡음이 많아요', '제목·설명이 소리와 달라요', '트리거 종류를 다시 골라 주세요'];

/** 블록 승인: 판매자가 올린 블록을 듣고·보고 승인하거나 이유와 함께 돌려보내기 */
function BlockReview({ onPendingCount }) {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(null);

  const load = useCallback(async () => {
    setPage(null);
    try {
      const data = await adminApi.blocks(status);
      const total = data.pageInfo?.totalElements ?? data.content.length;
      setPage({ content: data.content, total });
      if (status === 'PENDING') onPendingCount?.(total);
    } catch (e) {
      toast.error(errorMessage(e));
      setPage({ content: [], total: 0 });
    }
  }, [status, onPendingCount]);
  useEffect(() => { load(); }, [load]);

  const done = (id, message) => {
    toast.success(message);
    setPage((p) => ({ content: p.content.filter((b) => b.id !== id), total: p.total - 1 }));
    adminApi.blocks('PENDING', 0, 1).then((d) => onPendingCount?.(d.pageInfo?.totalElements ?? 0)).catch(() => {});
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.status} type="button" className={`chip ${status === t.status ? 'chip-on' : ''}`} onClick={() => setStatus(t.status)}
            data-testid={`review-tab-${t.status}`}>
            {t.label}{status === t.status && page ? ` ${page.total}` : ''}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {page === null ? <BlockLoader small label="불러오는 중" /> : page.content.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">
            {status === 'PENDING' ? '승인을 기다리는 블록이 없어요. 판매자가 올리면 여기에 보여요.' : '아직 없어요.'}
          </p>
        ) : page.content.map((b) => <ReviewCard key={b.id} block={b} status={status} onDone={done} />)}
      </div>
    </div>
  );
}

function ReviewCard({ block, status, onDone }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState(block.price);
  const [busy, setBusy] = useState(false);
  const openVideo = useVideoModal((s) => s.open);

  const act = async (next) => {
    setBusy(true);
    try {
      await adminApi.setStatus(block.id, next, next === 'REJECTED' ? note.trim() : undefined);
      onDone(block.id, next === 'APPROVED' ? `"${block.title}" 승인했어요. 이제 상점에 보여요.` : `"${block.title}" 돌려보냈어요.`);
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  };
  const savePrice = async () => {
    try {
      await adminApi.setPrice(block.id, Number(price) || 0);
      toast.success('가격을 바꿨어요.');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const meta = [
    block.category?.parentName ? `${block.category.parentName} › ${block.category.name}` : block.category?.name,
    TALK_LABEL[block.talkType || 'NONE'],
    formatDuration(block.duration),
    block.recordedPlace,
    new Date(block.createdAt).toLocaleDateString('ko-KR'),
  ].filter(Boolean).join(' · ');

  return (
    <article className="card p-4 sm:p-5" data-testid={`review-${block.id}`}>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="shrink-0">
          <Brick color={colorOf(block.category)} width={150} height={52} icon={iconOf(block.category)}
            minutes={block.duration / 60} label={formatDuration(block.duration)} design={block.design} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">{block.title}</p>
          <p className="mt-0.5 text-xs text-muted">@{block.uploader?.nickname} · {meta}</p>
          {noteOf(block.description) && <p className="mt-2 text-sm text-muted">{noteOf(block.description)}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* 관리자는 유료 블록도 전체를 들어 봄 */}
            <audio controls preload="none" src={block.fileUrl || block.previewUrl} className="h-9 w-full max-w-sm" />
            {block.design?.videoUrl && (
              <button type="button" className="btn-line btn-sm" onClick={() => openVideo(block)}><IoFilm /> 영상 보기</button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          가격
          <input type="number" min={0} max={10000} value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-20 rounded-lg border border-line bg-night px-2 py-1.5 text-sm text-ink" aria-label="가격(코인)" />
          코인{Number(price) === 0 ? ' (무료)' : ''}
        </label>
        {Number(price) !== block.price && <button type="button" className="btn-line btn-sm" onClick={savePrice}>가격 저장</button>}
        <div className="ml-auto flex gap-2">
          {status !== 'REJECTED' && (
            <button type="button" className="btn-line btn-sm" onClick={() => setRejecting((v) => !v)} disabled={busy} data-testid={`reject-${block.id}`}>
              <IoReturnUpBack /> 돌려보내기
            </button>
          )}
          {status !== 'APPROVED' && (
            <button type="button" className="btn-pink btn-sm" onClick={() => act('APPROVED')} disabled={busy} data-testid={`approve-${block.id}`}>
              <IoCheckmarkCircle /> 승인
            </button>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 rounded-xl bg-card-active p-3.5">
          <p className="text-sm font-bold">돌려보내는 이유 <span className="text-xs font-normal text-faint">· 판매자의 "내가 올린 블록"에 보여요</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button" className="chip px-2.5 py-1 text-xs" onClick={() => setNote(r)}>{r}</button>
            ))}
          </div>
          <textarea className="input mt-2 min-h-[64px]" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="예: 소리가 너무 작아요. 볼륨을 키워서 다시 올려 주세요." data-testid={`reject-note-${block.id}`} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setRejecting(false)}>취소</button>
            <button type="button" className="btn-line btn-sm text-danger" onClick={() => act('REJECTED')} disabled={busy} data-testid={`reject-send-${block.id}`}>
              돌려보내기
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default BlockReview;
