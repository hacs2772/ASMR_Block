import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoLockClosed, IoPlay, IoStar } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, playlistApi } from '../../api/api';
import { formatLength, listenLabel } from '../../lib/blocks';
import useAuthStore from '../../store/authStore';

/** 조합 미리보기: 첫째 줄 블록 색을 옆으로 누운 작은 레고로 (레이어드가 있으면 아래 얇은 줄) */
export function ComboBricks({ colors = [], hasMix, big }) {
  return (
    <div className={`flex flex-col justify-center gap-1.5 rounded-lg bg-plate px-2.5 ${big ? 'h-16' : 'h-12'}`}>
      <div className="flex pr-1.5">
        {colors.slice(0, big ? 8 : 5).map((c, i) => (
          <span key={i} className="relative h-[18px] flex-1 rounded-[2px] border border-black/45 border-b-[3px]" style={{ background: c, zIndex: i }}>
            <span className="absolute -right-[3px] top-[4px] h-[7px] w-[4px] rounded-r-sm" style={{ background: c }} />
          </span>
        ))}
      </div>
      {hasMix && <span className="ml-[18%] h-1 w-1/2 rounded bg-faint" />}
    </div>
  );
}

/** 조합 카드: 듣기 + (남의 조합이면) 한 번에 담기 */
function ComboCard({ combo, rank, showOwner = true }) {
  const { t } = useTranslation();
  const meta = [
    t('common.loop', { length: formatLength(combo.totalDuration) }),
    t('common.blocks', { count: combo.blockCount }),
    combo.hasMix ? t('common.layered') : null,
    combo.listenMinutes > 0 ? t('common.repeat', { time: listenLabel(combo.listenMinutes) }) : null,
  ].filter(Boolean).join(' · ');

  return (
    <article className="card flex flex-col gap-3 p-4 transition-colors hover:border-line-strong" data-testid={`combo-${combo.id}`}>
      <div className="flex items-center gap-3">
        {rank ? <span className={`w-5 text-center text-lg font-extrabold ${rank <= 3 ? 'text-pink-text' : 'text-faint'}`}>{rank}</span> : null}
        <Link to={`/listen/${combo.id}`} className="w-24 shrink-0" aria-label={t('combo.listenTo', { title: combo.title })}>
          <ComboBricks colors={combo.previewColors} hasMix={combo.hasMix} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/listen/${combo.id}`} className="block truncate text-[15px] font-bold hover:text-pink-text">{combo.title}</Link>
          <p className="mt-1 truncate text-xs text-muted">{meta}</p>
          {showOwner && <p className="mt-0.5 truncate text-xs text-faint">@{combo.owner?.nickname}</p>}
        </div>
        <Link to={`/listen/${combo.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink text-white hover:bg-[#ff74a8]" aria-label={t('combo.listen')}>
          <IoPlay size={18} className="ml-0.5" />
        </Link>
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-3">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 text-xs text-muted">
          <IoStar size={12} className="text-pink-text" />
          <span className="whitespace-nowrap">{combo.collect?.collectCount > 0 ? t('combo.collectors', { count: combo.collect.collectCount }) : t('combo.new')}</span>
          {combo.recentPlays ? <span className="whitespace-nowrap text-faint">· {t('combo.weekPlays', { count: combo.recentPlays })}</span> : null}
        </p>
        <CollectComboButton combo={combo} />
      </div>
    </article>
  );
}

/** 조합 한 번에 담기 버튼 (앱 CollectButton과 같은 규칙) */
export function CollectComboButton({ combo, className = '' }) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [copyId, setCopyId] = useState(combo.collect?.collectedId ?? null);
  const [busy, setBusy] = useState(false);

  if (!isAuthenticated) {
    return <button type="button" className={`btn-line btn-sm ${className}`} onClick={() => navigate('/login')}><IoStar size={13} /> {t('combo.loginToCollect')}</button>;
  }
  if (user && combo.owner?.id === user.id) return <span className={`text-xs text-faint ${className}`}>{t('combo.mine')}</span>;
  if (copyId) {
    return (
      <Link to={`/listen/${copyId}`} className={`btn-line btn-sm text-success ${className}`} data-testid={`combo-collected-${combo.id}`}>
        <IoCheckmarkCircle size={14} /> {t('combo.inMine')}
      </Link>
    );
  }
  if (combo.collect?.lockedCount > 0) {
    return <span className={`btn-line btn-sm cursor-default text-faint ${className}`}><IoLockClosed size={12} /> {t('combo.lockedBlocks', { count: combo.collect.lockedCount })}</span>;
  }
  const collect = async () => {
    setBusy(true);
    try {
      const copy = await playlistApi.collect(combo.id);
      setCopyId(copy.id);
      toast.success(t('combo.collected'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={`btn-pink btn-sm ${className}`} onClick={collect} disabled={busy} data-testid={`combo-collect-${combo.id}`}>
      <IoStar size={13} /> {t('combo.collect')}
    </button>
  );
}

export default ComboCard;
