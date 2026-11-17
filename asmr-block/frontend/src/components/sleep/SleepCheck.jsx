import React, { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, sleepApi } from '../../api/api';
import { listenedLabel, nightLabel, RATINGS, thanksOf } from '../../lib/sleepLog';
import { SLEEP_RATED } from './GoodNightCombos';
import useAuthStore from '../../store/authStore';

/**
 * 아침 한 번: "어젯밤 잘 잤어요?" (어젯밤 조합을 틀었고 아직 답하지 않았으면, 새벽 4시부터 — 서버가 정함).
 * 답하면 잘 잔 밤의 소리를 취향·오늘 밤 조합에 반영. 건너뛰기를 누르면 그 밤은 다시 안 물어봄 (앱 components/sleep/SleepCheck.tsx와 같음)
 */
function SleepCheck({ className = '' }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [pending, setPending] = useState(null);
  const [answered, setAnswered] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAnswered(null);
    if (!isAuthenticated) { setPending(null); return; }
    sleepApi.pending().then(setPending).catch(() => setPending(null));
  }, [isAuthenticated]);

  const answer = async (rating) => {
    if (busy || !pending) return;
    setBusy(true);
    try {
      await sleepApi.rate(pending.night, rating);
      // 홈 "잘 잤던 날 들은 조합"이 바로 새로 받게 (components/sleep/GoodNightCombos.jsx)
      window.dispatchEvent(new Event(SLEEP_RATED));
      if (rating === 0) setPending(null);
      else setAnswered(rating);
    } catch (e) {
      toast.error(errorMessage(e, t('sleepLog.failed')));
    } finally {
      setBusy(false);
    }
  };

  if (!pending) return null;
  const combos = pending.combos.map((c) => c.title).join(', ');
  const longest = Math.max(0, ...pending.combos.map((c) => c.minutes));
  return (
    <div className={`card relative p-5 ${className}`} data-testid="sleep-check">
      {answered ? (
        <p className="flex items-center gap-2 text-sm font-bold" data-testid="sleep-thanks">
          <span aria-hidden="true" className="text-xl">{RATINGS.find((r) => r.value === answered)?.emoji}</span>{thanksOf(answered)}
        </p>
      ) : (
        <>
          <button type="button" className="btn-ghost absolute right-2 top-2 p-1.5 text-faint" onClick={() => answer(0)} disabled={busy}
            aria-label={t('sleepLog.skip')} title={t('sleepLog.skip')} data-testid="sleep-skip"><IoClose size={18} /></button>
          <p className="pr-8 text-lg font-extrabold">{t('sleepLog.askTitle')}</p>
          <p className="mt-1 truncate text-xs text-muted">
            {nightLabel(pending.night)} · {listenedLabel(longest)} · {t('sleepLog.listenedCombos', { combos })}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label={t('sleepLog.askTitle')}>
            {RATINGS.map((r) => (
              <button key={r.value} type="button" onClick={() => answer(r.value)} disabled={busy}
                className="flex flex-col items-center gap-1 rounded-xl border border-line bg-night px-2 py-3 text-xs font-bold text-muted transition-colors hover:border-pink hover:text-ink"
                data-testid={`sleep-${r.key}`}>
                <span className="text-2xl" aria-hidden="true">{r.emoji}</span>{t(`sleepLog.${r.key}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default SleepCheck;
