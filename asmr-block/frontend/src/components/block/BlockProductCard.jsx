import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoCube, IoLocation, IoPause, IoPlay, IoShareSocialOutline, IoVideocam, IoWallet } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { coinApi, errorMessage, libraryApi } from '../../api/api';
import { usePreviewStore } from '../../hooks/usePreview';
import { colorOf, formatDuration, groupLabel, iconOf, noteOf, talkLabel } from '../../lib/blocks';
import { shareLink, shareLinks } from '../../lib/share';
import useAuthStore from '../../store/authStore';
import Brick from '../brand/Brick';
import { useVideoModal } from './VideoModal';
import { ReportButton } from '../common/Report';
import useHiddenStore from '../../store/hiddenStore';
import { useBuy } from '../coin/BuyModal';

/** 상점 블록 폭: 소리 길이에 비례 (너무 짧거나 길어도 카드 안에 들어가게) */
export const productBrickWidth = (seconds) => Math.round(Math.min(178, Math.max(76, (seconds / 60) * 30)));

/**
 * 블록 상품 카드 (앱 BlockCard와 같은 모양): 레고 바닥판 위에 블록 하나 + 가격표 + 듣기,
 * 아래에 이름 · 트리거 · 말소리 · @크리에이터(누르면 크리에이터 페이지) · 녹음한 곳 · 공유·신고 · 블록 담기.
 * hideCreator: 크리에이터 페이지 안에서는 @닉네임을 빼고 녹음한 곳만
 */
function BlockProductCard({ block, rank, onCollected, preview = false, hideCreator = false }) {
  const { t } = useTranslation();
  const playingId = usePreviewStore((s) => s.playingId);
  const toggle = usePreviewStore((s) => s.toggle);
  const playing = playingId === block.id;
  const paid = block.price > 0;
  const color = colorOf(block.category);
  const group = groupLabel(block.category);
  const canListen = !!(block.fileUrl || block.previewUrl);
  const openVideo = useVideoModal((s) => s.open);
  const me = useAuthStore((s) => s.user);
  const canReport = !preview && block.uploader?.id !== me?.id;
  const hidden = useHiddenStore((s) => !preview && s.ids.includes(block.uploader?.id));
  if (hidden) return null;

  return (
    <article className="card flex flex-col overflow-hidden transition-colors hover:border-line-strong" data-testid={`block-${block.id}`}>
      <div className="studs relative flex h-28 items-center bg-plate px-4">
        <Brick color={color} width={productBrickWidth(block.duration)} height={48} icon={iconOf(block.category)}
          label={formatDuration(block.duration)} minutes={block.duration / 60} design={block.design && { ...block.design, hasVideo: false }} />
        {block.design?.hasVideo && (
          block.design.videoUrl && !preview ? (
            <button type="button" onClick={() => openVideo(block)} className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white hover:bg-black"
              data-testid={`watch-${block.id}`}>
              <IoVideocam size={12} /> {t('block.watchVideo')}
            </button>
          ) : (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
              <IoVideocam size={12} /> {t('block.video')}
            </span>
          )
        )}
        <span className="price-tag absolute right-3 top-3" data-testid={`price-${block.id}`}>
          {paid ? t('common.coins', { count: block.price }) : t('common.free')}
        </span>
        {canListen && (
          <button type="button" onClick={() => toggle(block)} aria-label={playing ? t('block.pause') : t('block.preview')}
            className={`absolute bottom-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              playing ? 'bg-pink text-white' : 'bg-black/60 text-ink hover:bg-black/80'}`}>
            {playing ? <IoPause size={13} /> : <IoPlay size={13} />}
            {paid && !block.owned ? t('block.sec30') : t('block.listen')}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="truncate text-[15px] font-bold">
          {rank ? <span className="mr-1.5 text-pink-text">{rank}</span> : null}{block.title}
        </h3>
        {/* 영어는 트리거 이름이 길어서: 이름 중간("No / talking")이 아니라 " · " 앞뒤에서만 줄바꿈 */}
        <p className="text-xs text-muted"><span className="whitespace-nowrap">{group}</span> · <span className="whitespace-nowrap">{talkLabel(block.talkType)}</span></p>
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs text-faint">
            {!hideCreator && (block.uploader?.id && !preview
              ? <Link to={`/creator/${block.uploader.id}`} className="truncate hover:text-pink-text" data-testid={`creator-link-${block.id}`}>@{block.uploader.nickname}</Link>
              : <span className="truncate">@{block.uploader?.nickname}</span>)}
            {block.recordedPlace && <>{!hideCreator && <span>·</span>}<IoLocation size={11} className="shrink-0" /><span className="truncate">{block.recordedPlace}</span></>}
          </p>
          {!preview && (
            <button type="button" aria-label={t('block.shareThis', { title: block.title })} data-testid={`share-block-${block.id}`}
              onClick={() => shareLink(block.title, shareLinks.block(block.id), t('block.shareText', { title: block.title, nickname: block.uploader?.nickname ?? '' }))}
              className="shrink-0 p-0.5 text-faint hover:text-ink">
              <IoShareSocialOutline size={13} />
            </button>
          )}
          {canReport && (
            <ReportButton target={{ type: 'BLOCK', id: block.id, title: block.title }} owner={block.uploader?.id ? block.uploader : null}
              label="" className="shrink-0 p-0.5" testId={`report-block-${block.id}`} />
          )}
        </div>
        {noteOf(block.description) && <p className="line-clamp-2 text-xs leading-relaxed text-muted">{noteOf(block.description)}</p>}
        <div className="mt-auto pt-3">
          {preview
            ? <span className="btn-pink btn-sm w-full cursor-default"><IoCube size={14} /> {t('block.add')}</span>
            : <CollectBlockButton block={block} onCollected={onCollected} />}
        </div>
      </div>
    </article>
  );
}

/** 블록 담기: 무료는 바로, 유료는 코인으로 사기(확인 창), 이미 있으면 "블록함에 있음" */
export function CollectBlockButton({ block, onCollected }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [owned, setOwned] = useState(block.owned);
  const [busy, setBusy] = useState(false);

  if (owned) {
    return <span className="btn-line btn-sm w-full cursor-default text-success"><IoCheckmarkCircle size={14} /> {t('block.inBox')}</span>;
  }
  if (block.price > 0) {
    const buy = () => {
      if (!isAuthenticated) return navigate('/login');
      useBuy.getState().open({
        kind: 'block', title: block.title, price: block.price,
        run: () => coinApi.purchase(block.id),
        onDone: () => {
          setOwned(true);
          toast.success(t('coin.bought', { title: block.title }));
          onCollected?.(block);
        },
      });
      return undefined;
    };
    return (
      <button type="button" className="btn-pink btn-sm w-full" onClick={buy} data-testid={`buy-block-${block.id}`}>
        <IoWallet size={14} /> {t('coin.buy', { count: block.price })}
      </button>
    );
  }
  const collect = async () => {
    if (!isAuthenticated) return navigate('/login');
    setBusy(true);
    try {
      await libraryApi.add(block.id);
      setOwned(true);
      toast.success(t('block.added', { title: block.title }));
      onCollected?.(block);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="btn-pink btn-sm w-full" onClick={collect} disabled={busy} data-testid={`collect-block-${block.id}`}>
      <IoCube size={14} /> {t('block.add')}
    </button>
  );
}

export default BlockProductCard;
