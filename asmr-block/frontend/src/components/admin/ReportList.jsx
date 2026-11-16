import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoArrowUndo, IoCheckmarkCircle, IoCube, IoEyeOff, IoLayers, IoPause, IoPerson, IoPlay } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import { REPORT_REASONS } from '../common/Report';
import BlockLoader from '../brand/BlockLoader';
import { shortDateTime } from '../../lib/time';

const FILTERS = [
  { status: 'OPEN', label: '새 신고' },
  { status: 'HIDDEN', label: '숨긴 것' },
  { status: 'DISMISSED', label: '문제없음' },
];

const TYPES = {
  BLOCK: { label: '블록', icon: IoCube },
  PLAYLIST: { label: '조합', icon: IoLayers },
  USER: { label: '사람', icon: IoPerson },
};

/** 지금 상태를 쉬운 말로 */
const STATE_LABEL = {
  APPROVED: '상점에 보임', PENDING: '승인 대기', REJECTED: '내려감',
  PUBLIC: '공개 중', PRIVATE: '비공개', HIDDEN: '숨김',
  ACTIVE: '업로드 가능', BANNED: '업로드 막힘',
};

/** 관리자: 신고 (대상별로 묶어서). 들어 보고 숨기기 / 문제없음, 숨긴 것은 되돌리기 */
function ReportList({ onOpenCount }) {
  const [filter, setFilter] = useState(0);
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const status = FILTERS[filter].status;

  const load = useCallback(async () => {
    setItems(null);
    try {
      const data = await adminApi.reports(status);
      setItems(data);
      if (status === 'OPEN') onOpenCount?.(data.length);
    } catch (e) {
      toast.error(errorMessage(e));
      setItems([]);
    }
  }, [status, onOpenCount]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (item, action, extra = {}) => {
    const key = `${item.targetType}-${item.targetId}`;
    setBusy(key);
    try {
      const res = await adminApi.resolveReport({ targetType: item.targetType, targetId: item.targetId, action, ...extra });
      toast.success(res.message || '처리했어요.');
      setItems((list) => list.filter((x) => `${x.targetType}-${x.targetId}` !== key));
      if (status === 'OPEN') onOpenCount?.((items?.length ?? 1) - 1);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <p className="max-w-2xl text-sm text-muted">
        사이트·앱의 &ldquo;신고&rdquo;로 들어온 블록·조합·사람이에요. 들어 보고 <b className="text-ink">숨기기</b>를 누르면 바로 내려가요
        (블록 = 상점에서 빠지고 판매자에게 이유가 보임, 조합 = 공개 목록·공유 링크에서 빠짐, 사람 = 블록 올리기 막힘). 이미 담은 사람은 그대로 들어요.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button key={f.status} type="button" className={`chip ${filter === i ? 'chip-on' : ''}`} onClick={() => setFilter(i)}
            data-testid={`report-filter-${f.status}`}>
            {f.label}{filter === i && items ? ` ${items.length}` : ''}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {items === null ? <BlockLoader small label="불러오는 중" /> : items.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">{status === 'OPEN' ? '새 신고가 없어요.' : '아직 없어요.'}</p>
        ) : items.map((item) => (
          <ReportCard key={`${item.targetType}-${item.targetId}`} item={item} status={status}
            busy={busy === `${item.targetType}-${item.targetId}`} onResolve={resolve} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ item, status, busy, onResolve }) {
  const [ban, setBan] = useState(false);
  const [note, setNote] = useState('');
  const type = TYPES[item.targetType];
  const reasons = REPORT_REASONS.filter((r) => item.reasons?.[r.key] > 0);
  return (
    <article className="card p-4" data-testid={`report-${item.targetType}-${item.targetId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-md bg-card-active px-2 py-0.5 text-xs font-bold text-muted">
          <type.icon size={12} /> {type.label}
        </span>
        <p className="min-w-0 flex-1 truncate text-[15px] font-bold">
          {item.targetType === 'PLAYLIST'
            ? <Link to={`/listen/${item.targetId}`} className="hover:text-pink-text" target="_blank" rel="noreferrer">{item.title ?? `#${item.targetId}`}</Link>
            : item.targetType === 'USER' ? `@${item.title ?? item.targetId}` : (item.title ?? `#${item.targetId}`)}
        </p>
        <span className="text-xs font-semibold text-muted">{STATE_LABEL[item.state] ?? item.state}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {item.targetType !== 'USER' && item.ownerNickname && <span>올린 사람 @{item.ownerNickname}</span>}
        <span className="font-bold text-pink-text">신고 {item.count}건</span>
        {reasons.map((r) => <span key={r.key} className="rounded-full border border-line px-2 py-0.5">{r.short} {item.reasons[r.key]}</span>)}
        <span className="text-faint">{shortDateTime(item.lastAt)}</span>
      </div>
      {item.details && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-card-active p-3 text-sm leading-relaxed">{item.details}</p>}
      {item.mediaUrl && <Listen url={item.mediaUrl} />}

      {status === 'OPEN' && (
        <div className="mt-4 space-y-3 border-t border-line pt-3">
          {item.targetType === 'BLOCK' && (
            <input className="input text-sm" maxLength={150} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="숨길 때 판매자에게 보일 이유 (선택)" data-testid="report-note" />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {item.targetType !== 'USER' && item.ownerId && (
              <label className="mr-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={ban} onChange={(e) => setBan(e.target.checked)} className="accent-pink" data-testid="report-ban" />
                올린 사람 업로드도 막기
              </label>
            )}
            <button type="button" className="btn-line btn-sm" disabled={busy} onClick={() => onResolve(item, 'DISMISS')} data-testid="report-dismiss">
              <IoCheckmarkCircle /> 문제없음
            </button>
            <button type="button" className="btn-pink btn-sm" disabled={busy} data-testid="report-hide"
              onClick={() => onResolve(item, 'HIDE', { banOwner: ban, note: note.trim() || null })}>
              <IoEyeOff /> {item.targetType === 'USER' ? '업로드 막기' : '숨기기'}
            </button>
          </div>
        </div>
      )}
      {status === 'HIDDEN' && (
        <div className="mt-4 flex justify-end border-t border-line pt-3">
          <button type="button" className="btn-line btn-sm" disabled={busy} onClick={() => onResolve(item, 'RESTORE')} data-testid="report-restore">
            <IoArrowUndo /> 되돌리기
          </button>
        </div>
      )}
    </article>
  );
}

/** 신고된 블록 바로 들어 보기 */
function Listen({ url }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {}); else el.pause();
  };
  return (
    <div className="mt-3">
      <button type="button" onClick={toggle} className="btn-line btn-sm" data-testid="report-listen">
        {playing ? <IoPause /> : <IoPlay />} {playing ? '멈춤' : '들어 보기'}
      </button>
      <audio ref={ref} src={url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  );
}

export default ReportList;
