import React, { useEffect, useState } from 'react';
import { IoBarChart } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import { sellerApi } from '../../api/api';
import { barsOf, dayLabel, ticksOf, tipOf } from '../../lib/creatorStats';
import { localeOf } from '../../locales';

/**
 * 블록 판매 화면 "내 블록 통계" (앱 components/upload/CreatorStats.tsx와 같은 내용).
 * 숫자 네 칸(담은 사람 · 쓰인 조합 · 14일 새로 담김 · 14일 들음) + 최근 14일 막대그래프.
 * 막대는 한 번에 하나만 (담김과 들음은 크기가 달라 한 축에 같이 그리지 않음) → 아래 두 칸을 눌러 바꿈.
 * refreshKey가 바뀌면 다시 받음 (새로 올렸을 때)
 */
function CreatorStats({ refreshKey }) {
  const { t } = useTranslation();
  const [s, setS] = useState(null);
  const [metric, setMetric] = useState('collects');
  useEffect(() => { sellerApi.stats().then(setS).catch(() => {}); }, [refreshKey]);
  if (!s) return null;
  const num = (n) => n.toLocaleString(localeOf());
  const total = metric === 'plays' ? s.plays14d : s.collects14d;

  return (
    <section className="card mt-5 p-5" data-testid="creator-stats">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="mr-auto flex items-center gap-2">
          <p className="font-extrabold">{t('cstats.title')}</p>
        </div>
        <p className="text-xs text-muted" data-testid="cstats-listed">{t('cstats.listed', { listed: num(s.listedBlocks), pending: num(s.pendingBlocks) })}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t('cstats.pick')}>
        <Tile label={t('cstats.collectors')} value={t('cstats.people', { n: num(s.collectors) })} testId="cstats-collectors" />
        <Tile label={t('cstats.combos')} value={t('cstats.count', { n: num(s.usedInCombos) })} testId="cstats-combos" />
        <Tile label={t('cstats.collects')} value={t('cstats.people', { n: num(s.collects14d) })} chart
          active={metric === 'collects'} onClick={() => setMetric('collects')} testId="cstats-collects" />
        <Tile label={t('cstats.plays')} value={t('cstats.times', { n: num(s.plays14d) })} chart
          active={metric === 'plays'} onClick={() => setMetric('plays')} testId="cstats-plays" />
      </div>

      <p className="mt-5 text-sm font-bold" data-testid="cstats-chart-title">{t(metric === 'plays' ? 'cstats.chartPlays' : 'cstats.chartCollects')}</p>
      {total === 0 ? (
        <p className="mt-2 rounded-xl bg-night px-4 py-5 text-sm text-muted" data-testid="cstats-empty">{t('cstats.empty')}</p>
      ) : (
        <Chart days={s.days} metric={metric} />
      )}
      <p className="mt-3 text-xs leading-relaxed text-faint">{t('cstats.note')}</p>
    </section>
  );
}

function Tile({ label, value, chart, active, onClick, testId }) {
  const body = (
    <>
      <p className="flex items-center gap-1 truncate text-[11px] text-muted">
        {chart && <IoBarChart size={11} className={active ? 'text-pink-text' : ''} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="truncate text-base font-extrabold" data-testid={testId}>{value}</p>
    </>
  );
  if (!onClick) return <div className="rounded-xl bg-night px-3 py-2.5">{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} data-testid={`${testId}-tile`}
      className={`rounded-xl px-3 py-2.5 text-left transition ${active ? 'bg-pink-soft ring-1 ring-pink/50' : 'bg-night hover:bg-card-active'}`}>
      {body}
    </button>
  );
}

/** 최근 14일 막대 (가장 큰 날에만 숫자, 올리거나 누르면 그날 숫자). 화면 읽기용 표도 같이 */
function Chart({ days, metric }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(null);
  const b = barsOf(days, metric);
  const n = days.length;
  const tickStyle = (i) => (i === 0 ? { left: 0 } : i === n - 1 ? { right: 0 }
    : { left: `${((i + 0.5) / n) * 100}%`, transform: 'translateX(-50%)' });
  // 가장자리 막대의 말풍선은 카드 밖으로 나가지 않게 한쪽으로 붙임
  const tipSide = (i) => (i < 3 ? 'left-0' : i > n - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2');

  return (
    <div className="mt-2">
      <div className="h-32 pt-7">
        <div className="flex h-full items-end gap-0.5 border-b border-line" onMouseLeave={() => setHover(null)} data-testid="cstats-chart">
          {days.map((d, i) => {
            const h = b.heights[i];
            const showTip = hover === i;
            const showMax = hover === null && i === b.maxIndex;
            return (
              <button type="button" key={d.date} aria-label={tipOf(d.date, metric, b.values[i])}
                className="relative flex h-full flex-1 items-end justify-center rounded-t outline-none focus-visible:bg-white/5"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setHover(i)} data-testid={`cstats-bar-${i}`}>
                {h > 0 && (
                  <span className={`block w-full max-w-[24px] rounded-t bg-pink transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
                    style={{ height: `${h * 100}%` }} />
                )}
                {showMax && (
                  <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-ink"
                    style={{ bottom: `calc(${h * 100}% + 4px)` }}>{b.values[i].toLocaleString(localeOf())}</span>
                )}
                {showTip && (
                  <span className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-card-active px-2.5 py-1 text-xs font-bold text-ink shadow-lg ring-1 ring-line ${tipSide(i)}`}
                    style={{ bottom: `calc(${h * 100}% + 6px)` }} data-testid="cstats-tip">{tipOf(d.date, metric, b.values[i])}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-muted" aria-hidden="true">
        {ticksOf(n).map((i) => (
          <span key={i} className="absolute whitespace-nowrap" style={tickStyle(i)}>
            {i === n - 1 ? t('cstats.today') : dayLabel(days[i].date)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{t(metric === 'plays' ? 'cstats.chartPlays' : 'cstats.chartCollects')}</caption>
        <thead><tr><th scope="col">{t('cstats.dateCol')}</th><th scope="col">{t(metric === 'plays' ? 'cstats.plays' : 'cstats.collects')}</th></tr></thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.date}><th scope="row">{dayLabel(d.date)}</th><td>{b.values[i]}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CreatorStats;
