import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle, IoClose, IoCube, IoLayers, IoNotifications, IoNotificationsOffOutline, IoReturnDownBack } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import i18n from '../../locales';
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

/** 알림 문장 (지금 언어로). 서버 message는 한국어라, 제목·사람·수로 화면에서 만듦 */
export function notificationText(n) {
  const t = i18n.t.bind(i18n);
  const values = { title: n.title, actor: n.actor };
  if (!n.title) return n.message;
  switch (n.type) {
    case 'BLOCK_APPROVED':
    case 'BLOCK_REJECTED':
      return t(`notif.msg.${n.type}`, values);
    case 'BLOCK_COLLECTED':
    case 'COMBO_COLLECTED': {
      const kind = n.type === 'BLOCK_COLLECTED' ? 'block' : 'combo';
      if (!n.actor) return t(`notif.msg.${kind}Someone`, values);
      return n.count > 1 ? t(`notif.msg.${kind}Many`, { ...values, count: n.count - 1 }) : t(`notif.msg.${kind}One`, values);
    }
    default:
      return n.message;
  }
}

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
  const { t, i18n: { language } } = useTranslation();
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
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unread > 0 ? t('notif.bellUnread', { count: unread }) : t('notif.bell')}
        className="relative rounded-lg p-2 text-muted hover:text-ink" data-testid="notif-bell">
        <IoNotifications size={22} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-pink px-1 text-center text-[11px] font-bold leading-[18px] text-white"
            data-testid="notif-count">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label={t('notif.bell')} data-testid="notif-panel"
          className="card fixed inset-x-3 top-[68px] z-50 flex max-h-[calc(100vh-88px)] flex-col overflow-hidden shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-extrabold">{t('notif.bell')}</p>
            <button type="button" className="btn-ghost p-1" onClick={() => setOpen(false)} aria-label={t('common.close')}><IoClose size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items === null ? <BlockLoader small label={t('common.loading')} className="py-6" /> : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {summary && !summary.settings.review && !summary.settings.collect ? t('notif.offAll') : t('notif.empty')}
              </p>
            ) : items.map((n) => {
              const { icon: Icon, cls } = ICON[n.type] || ICON.BLOCK_COLLECTED;
              const to = targetPath(n.target, user?.id);
              return (
                <button key={n.id} type="button" disabled={!to} onClick={() => to && navigate(to)} data-testid={`notif-${n.id}`}
                  className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-card-active ${n.read ? '' : 'bg-pink-soft'}`}>
                  <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-ink">{notificationText(n)}</span>
                    {n.note && <span className="mt-1 block text-xs leading-snug text-muted">{t('notif.reason', { note: n.note })}</span>}
                    <span className="mt-1 block text-[11px] text-faint">{ago(n.at, Date.now(), language)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-pink" aria-label={t('notif.new')} />}
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
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const change = async (key) => {
    setBusy(true);
    try {
      const res = await notificationApi.settings({ ...settings, [key]: !settings[key] });
      onChange(res.data);
      toast.success(!res.data.settings.review && !res.data.settings.collect ? t('notif.savedOff') : t('notif.saved'));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const rows = [
    { key: 'review', label: t('notif.review'), hint: t('notif.reviewHint') },
    { key: 'collect', label: t('notif.collect'), hint: t('notif.collectHint') },
  ];
  const allOff = !settings.review && !settings.collect;
  return (
    <div className="border-t border-line bg-card-active/60 px-4 py-3" data-testid="notif-settings">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted">
        {allOff && <IoNotificationsOffOutline />} {t('notif.settingsTitle')}
      </p>
      {rows.map((r) => (
        <label key={r.key} className="flex cursor-pointer items-center gap-3 py-1.5">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{r.label}</span>
            <span className="block text-[11px] text-faint">{r.hint}</span>
          </span>
          <button type="button" role="switch" aria-checked={settings[r.key]} disabled={busy} onClick={() => change(r.key)}
            aria-label={settings[r.key] ? t('notif.turnOff', { label: r.label }) : t('notif.turnOn', { label: r.label })} data-testid={`notif-toggle-${r.key}`}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${settings[r.key] ? 'bg-pink' : 'bg-line-strong'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${settings[r.key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </button>
        </label>
      ))}
    </div>
  );
}
