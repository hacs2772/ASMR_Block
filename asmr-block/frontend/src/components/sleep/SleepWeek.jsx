import React, { useEffect, useState } from 'react';
import { IoRemove, IoTrendingDown, IoTrendingUp } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, sleepApi } from '../../api/api';
import { categoryName } from '../../lib/blocks';
import { compareOf, listenedLabel, listenedShort, nightLabel, RATINGS, ratingOf, weekdayOf } from '../../lib/sleepLog';
import { GoodComboRow } from './GoodNightCombos';

/**
 * 내 정보: 최근 7일 잠 기록 — 위 = 이번 주 리포트(잘 잔 밤·틀어 본 밤·들은 시간 + 지난주와 비교),
 * 밤마다 답(😴😐😣)·틀었는지(누르면 그 밤을 기록하거나 바꿈), 이번 주 가장 잘 잔 조합(다시 듣기),
 * 아래 한 줄 = 잘 잔 밤에 많이 들은 소리 (앱 components/sleep/SleepWeek.tsx와 같음)
 */
function SleepWeek({ className = '' }) {
  const { t } = useTranslation();
  const [week, setWeek] = useState(null);
  const [open, setOpen] = useState(null);
  const load = () => sleepApi.week().then(setWeek).catch(() => setWeek({ nights: [], goodTriggers: [] }));
  useEffect(() => { load(); }, []);

  const rate = async (night, rating) => {
    try {
      await sleepApi.rate(night, rating);
      setOpen(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, t('sleepLog.failed')));
    }
  };

  if (!week) return null;
  const selected = week.nights.find((n) => n.night === open);
  const anything = week.nights.some((n) => n.rating != null || n.combos.length > 0);
  const report = week.report;
  return (
    <div className={`card p-5 ${className}`} data-testid="sleep-week">
      <p className="font-extrabold">{t('sleepLog.weekTitle')}</p>
      {anything && report && <Report report={report} />}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {week.nights.map((n) => {
          const r = ratingOf(n.rating);
          const played = n.combos.length > 0;
          return (
            <button key={n.night} type="button" onClick={() => setOpen(open === n.night ? null : n.night)}
              aria-pressed={open === n.night} aria-label={`${nightLabel(n.night)} · ${r ? t(`sleepLog.${r.key}`) : t('sleepLog.noRecord')}`}
              className={`flex flex-col items-center gap-1 rounded-lg border px-0.5 py-2 text-[11px] text-faint transition-colors ${open === n.night ? 'border-pink' : 'border-line hover:border-line-strong'}`}
              data-testid={`sleep-night-${n.night}`}>
              <span>{weekdayOf(n.night)}</span>
              <span className="flex h-6 items-center text-lg" aria-hidden="true">
                {r ? r.emoji : played ? <span className="h-2 w-2 rounded-full bg-pink" /> : <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />}
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="mt-3 rounded-xl border border-line bg-night p-3" data-testid="sleep-night-detail">
          <p className="text-xs font-bold">{nightLabel(selected.night)}
            {selected.combos.length > 0 && <span className="font-normal text-muted"> · {listenedLabel(selected.minutes)}</span>}
          </p>
          {selected.combos.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted">{t('sleepLog.listenedCombos', { combos: selected.combos.map((c) => c.title).join(', ') })}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RATINGS.map((r) => (
              <button key={r.value} type="button" onClick={() => rate(selected.night, r.value)}
                className={`chip px-2.5 py-1 text-xs ${selected.rating === r.value ? 'chip-on' : ''}`} data-testid={`sleep-rate-${r.key}`}>
                <span aria-hidden="true">{r.emoji}</span>{t(`sleepLog.${r.key}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      {report?.best && (
        <div className="mt-4" data-testid="sleep-best">
          <p className="mb-1.5 text-xs font-bold text-muted">{t('sleepLog.best')}</p>
          <GoodComboRow good={report.best} />
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        {week.goodTriggers.length > 0
          ? t('sleepLog.goodWith', { triggers: week.goodTriggers.map((g) => categoryName(g.code, g.name)).join(', ') })
          : !anything ? t('sleepLog.weekEmpty') : t('sleepLog.rateThis')}
      </p>
    </div>
  );
}

/** 이번 주 리포트: 숫자 세 칸 + 지난주와 비교한 한 줄 (지난주 기록이 없으면 비교 줄은 안 보임) */
function Report({ report }) {
  const { t } = useTranslation();
  const compare = compareOf(report);
  const Trend = compare?.trend === 'up' ? IoTrendingUp : compare?.trend === 'down' ? IoTrendingDown : IoRemove;
  return (
    <div className="mt-4" data-testid="sleep-report">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('sleepLog.statGood')} value={t('sleepLog.nights', { n: report.good })} testId="report-good" />
        <Stat label={t('sleepLog.statPlayed')} value={t('sleepLog.nights', { n: report.playedNights })} testId="report-played" />
        <Stat label={t('sleepLog.statListened')} value={listenedShort(report.minutes)} testId="report-listened" />
      </div>
      {compare && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted" data-testid="report-compare">
          <Trend aria-hidden="true" className={compare.trend === 'up' ? 'text-pink-text' : ''} />{compare.text}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, testId }) {
  return (
    <div className="rounded-xl bg-night px-3 py-2.5">
      <p className="truncate text-[11px] text-muted">{label}</p>
      <p className="truncate text-base font-extrabold" data-testid={testId}>{value}</p>
    </div>
  );
}

export default SleepWeek;
