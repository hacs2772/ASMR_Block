import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoCube, IoLocation, IoPause, IoPlay } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { errorMessage, libraryApi } from '../../api/api';
import { usePreviewStore } from '../../hooks/usePreview';
import { colorOf, formatDuration, iconOf, noteOf, TALK_LABEL } from '../../lib/blocks';
import useAuthStore from '../../store/authStore';
import Brick from '../brand/Brick';

/** 상점 블록 폭: 소리 길이에 비례 (너무 짧거나 길어도 카드 안에 들어가게) */
export const productBrickWidth = (seconds) => Math.round(Math.min(178, Math.max(76, (seconds / 60) * 30)));

/**
 * 블록 상품 카드 (앱 BlockCard와 같은 모양): 레고 바닥판 위에 블록 하나 + 가격표 + 듣기,
 * 아래에 이름 · 트리거 · 말소리 · @크리에이터 · 녹음한 곳 · 블록 담기
 */
function BlockProductCard({ block, rank, onCollected, preview = false }) {
  const playingId = usePreviewStore((s) => s.playingId);
  const toggle = usePreviewStore((s) => s.toggle);
  const playing = playingId === block.id;
  const paid = block.price > 0;
  const color = colorOf(block.category);
  const group = block.category?.parentName || block.category?.name;
  const canListen = !!(block.fileUrl || block.previewUrl);

  return (
    <article className="card flex flex-col overflow-hidden transition-colors hover:border-line-strong" data-testid={`block-${block.id}`}>
      <div className="studs relative flex h-28 items-center bg-plate px-4">
        <Brick color={color} width={productBrickWidth(block.duration)} height={48} icon={iconOf(block.category)}
          label={formatDuration(block.duration)} minutes={block.duration / 60} />
        <span className={`absolute right-3 top-3 rotate-3 rounded-md px-2 py-0.5 text-xs font-extrabold shadow ${
          paid ? 'bg-warn text-night' : 'bg-success/90 text-night'}`}>
          {paid ? `${block.price}코인` : '무료'}
        </span>
        {canListen && (
          <button type="button" onClick={() => toggle(block)} aria-label={playing ? '멈춤' : '미리 듣기'}
            className={`absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              playing ? 'bg-pink text-white' : 'bg-black/60 text-ink hover:bg-black/80'}`}>
            {playing ? <IoPause size={13} /> : <IoPlay size={13} />}
            {paid && !block.owned ? '30초' : '듣기'}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="truncate text-[15px] font-bold">
          {rank ? <span className="mr-1.5 text-pink-text">{rank}</span> : null}{block.title}
        </h3>
        <p className="text-xs text-muted">{group} · {TALK_LABEL[block.talkType || 'NONE']}</p>
        <p className="flex items-center gap-1 truncate text-xs text-faint">
          @{block.uploader?.nickname}
          {block.recordedPlace && <><span>·</span><IoLocation size={11} />{block.recordedPlace}</>}
        </p>
        {noteOf(block.description) && <p className="line-clamp-2 text-xs leading-relaxed text-muted">{noteOf(block.description)}</p>}
        <div className="mt-auto pt-3">
          {preview
            ? <span className="btn-pink btn-sm w-full cursor-default"><IoCube size={14} /> 블록 담기</span>
            : <CollectBlockButton block={block} onCollected={onCollected} />}
        </div>
      </div>
    </article>
  );
}

/** 블록 담기: 무료는 바로, 유료는 구매 준비 중, 이미 있으면 "블록함에 있음" */
export function CollectBlockButton({ block, onCollected }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [owned, setOwned] = useState(block.owned);
  const [busy, setBusy] = useState(false);

  if (owned) {
    return <span className="btn-line btn-sm w-full cursor-default text-success"><IoCheckmarkCircle size={14} /> 블록함에 있음</span>;
  }
  if (block.price > 0) {
    return <span className="btn-line btn-sm w-full cursor-default text-faint">구매 준비 중</span>;
  }
  const collect = async () => {
    if (!isAuthenticated) return navigate('/login');
    setBusy(true);
    try {
      await libraryApi.add(block.id);
      setOwned(true);
      toast.success(`'${block.title}'을 내 블록함에 담았어요`);
      onCollected?.(block);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="btn-pink btn-sm w-full" onClick={collect} disabled={busy} data-testid={`collect-block-${block.id}`}>
      <IoCube size={14} /> 블록 담기
    </button>
  );
}

export default BlockProductCard;
