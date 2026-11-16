import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoClose, IoCube, IoLayers, IoNotifications, IoNotificationsOffOutline, IoReturnDownBack } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { errorMessage, notificationApi } from '../../api/api';
import { ago } from '../../lib/time';
import useAuthStore from '../../store/authStore';
import BlockLoader from '../brand/BlockLoader';

const POLL_MS = 60_000;

const ICON = {
  BLOCK_APPROVED: { icon: IoCheckmarkCircle, cls: 'text-success' },
  BLOCK_REJECTED: { icon: IoReturnDownBack, cls: 'text-warn' },
  BLOCK_COLLECTED: { icon: IoCube, cls: 'text-pink-text' },
  COMBO_COLLECTED: { icon: IoLayers, cls: 'text-pink-text' },
};

/** 누르면 갈 곳: BLOCK = 내 크리에이터 페이지의 그 블록, UPLOADS = 내가 올린 블록, COMBO = 그 조합 듣기 */
export function targetPath(target, myId) {
  if (!target) return null;
  if (target.kind === 'BLOCK') return `/creator/${myId}?block=${target.id}`;
  if (target.kind === 'UPLOADS') return '/sell#mine';
  if (target.kind === 'COMBO') return `/listen/${target.id}`;
  return null;
}

/**
 * 머리글 종 아이콘 + 알림 창: 검수 결과(승인·돌려보냄) · 내 블록·조합을 담은 소식.
 * 1분마다(화면을 보고 있을 때만) 안 읽은 수를 받고, 창을 열면 모두 읽음으로. 창 아래에서 알림 끄기
 */
export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const boxRef = useRef(null);

  const refresh = useCallback(() => {
    if (document.visibilityState === 'hidden') return;
    notificationApi.summary().then(setSummary).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setItems(null);
    try {
      const page = await notificationApi.list();
      setItems(page.content);
      // 보여 준 뒤 읽음으로 (목록에서는 이번에 열 때까지 새 알림 표시가 남음)
      if (summary?.unread > 0) notificationApi.read().then(setSummary).catch(() => {});
    } catch (e) {
      setItems([]);
      toast.error(errorMessage(e));
    }
  };

  const unread = summary?.unread ?? 0;
  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unread > 0 ? `알림 ${unread}개 새로 옴` : '알림'}
        className="relative rounded-lg p-2 text-muted hover:text-ink" data-testid="notif-bell">
        <IoNotifications size={22} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-pink px-1 text-center text-[11px] font-bold leading-[18px] text-white"
            data-testid="notif-count">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="알림" data-testid="notif-panel"
          className="card fixed inset-x-3 top-[68px] z-50 flex max-h-[calc(100vh-88px)] flex-col overflow-hidden shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-extrabold">알림</p>
            <button type="button" className="btn-ghost p-1" onClick={() => setOpen(false)} aria-label="닫기"><IoClose size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items === null ? <BlockLoader small label="불러오는 중" className="py-6" /> : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {summary && !summary.settings.review && !summary.settings.collect ? '알림을 꺼 두었어요.' : '아직 알림이 없어요. 블록을 올리면 검수 결과와 담은 소식이 여기에 와요.'}
              </p>
            ) : items.map((n) => {
              const { icon: Icon, cls } = ICON[n.type] || ICON.BLOCK_COLLECTED;
              const to = targetPath(n.target, user?.id);
              return (
                <button key={n.id} type="button" disabled={!to} onClick={() => to && navigate(to)} data-testid={`notif-${n.id}`}
                  className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-card-active ${n.read ? '' : 'bg-pink-soft'}`}>
                  <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-ink">{n.message}</span>
                    {n.note && <span className="mt-1 block text-xs leading-snug text-muted">이유: {n.note}</span>}
                    <span className="mt-1 block text-[11px] text-faint">{ago(n.at)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink" aria-label="새 알림" />}
                </button>
              );
            })}
          </div>
          {summary && <NotifySettings settings={summary.settings} onChange={setSummary} />}
        </div>
      )}
    </div>
  );
}

/** 알림 끄기: 검수 결과 / 담김 소식 (끄면 아예 만들지 않음) */
function NotifySettings({ settings, onChange }) {
  const [busy, setBusy] = useState(false);
  const change = async (key) => {
    setBusy(true);
    try {
      const res = await notificationApi.settings({ ...settings, [key]: !settings[key] });
      onChange(res.data);
      toast.success(res.message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const rows = [
    { key: 'review', label: '검수 결과', hint: '내 블록이 승인되거나 돌려보내졌을 때' },
    { key: 'collect', label: '담김 소식', hint: '누가 내 블록이나 조합을 담았을 때' },
  ];
  const allOff = !settings.review && !settings.collect;
  return (
    <div className="border-t border-line bg-card-active/60 px-4 py-3" data-testid="notif-settings">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
        {allOff && <IoNotificationsOffOutline />} 알림 받기
      </p>
      {rows.map((r) => (
        <label key={r.key} className="flex cursor-pointer items-center gap-3 py-1.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{r.label}</span>
            <span className="block text-[11px] text-faint">{r.hint}</span>
          </span>
          <button type="button" role="switch" aria-checked={settings[r.key]} disabled={busy} onClick={() => change(r.key)}
            aria-label={`${r.label} 알림 ${settings[r.key] ? '끄기' : '켜기'}`} data-testid={`notif-toggle-${r.key}`}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings[r.key] ? 'bg-pink' : 'bg-line-strong'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings[r.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </label>
      ))}
    </div>
  );
}
