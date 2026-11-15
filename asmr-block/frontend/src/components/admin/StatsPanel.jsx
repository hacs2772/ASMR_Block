import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import BlockLoader from '../brand/BlockLoader';

const fmt = (n) => (n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만` : n.toLocaleString('ko-KR'));
const dayLabel = (iso) => { const [, m, d] = iso.split('-'); return `${Number(m)}/${Number(d)}`; };

/** 관리자: 베타 반응 숫자 한눈에 (숫자 칸 + 최근 14일 작은 막대 셋 + 표로 보기) */
function StatsPanel({ onOpenFeedback }) {
  const [stats, setStats] = useState(null);
  const [table, setTable] = useState(false);

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => { toast.error(errorMessage(e)); setStats(false); });
  }, []);
  if (stats === null) return <BlockLoader small label="불러오는 중" />;
  if (!stats) return <p className="card p-8 text-center text-sm text-muted">숫자를 불러오지 못했어요.</p>;

  const { people, activity, content, newFeedback, days } = stats;
  const series = [
    { key: 'signups', title: '새로 온 사람', unit: '명' },
    { key: 'combos', title: '새로 만든 조합', unit: '개' },
    { key: 'plays', title: '재생', unit: '번' },
  ];

  return (
    <div>
      <p className="max-w-2xl text-sm text-muted">
        관리자·샘플 계정은 빼고 센 숫자예요. 재생은 로그인한 사람이 들은 횟수예요(30분 안에 다시 들으면 1번). 날짜는 한국 시간이에요.
        방문자 수는 Cloudflare → asmrblock.com → Analytics에서 볼 수 있어요.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="stat-tiles">
        <Tile label="들어온 사람" value={people.total} delta={people.newToday} deltaLabel="오늘"
          sub={`베타 손님 ${fmt(people.betaGuests)} · 가입 회원 ${fmt(people.members)}`} />
        <Tile label="만든 조합" value={activity.combos} delta={activity.combos7d} deltaLabel="7일"
          sub={`공개 ${fmt(activity.publicCombos)} · 한 번에 담기 ${fmt(activity.collects)}`} />
        <Tile label="최근 7일 재생" value={activity.plays7d} delta={activity.plays24h} deltaLabel="24시간"
          sub={`지금까지 ${fmt(activity.playsTotal)}`} />
        <Tile label="상점 블록" value={content.approvedBlocks}
          sub={`샘플 ${fmt(content.sampleBlocks)} · 올라온 블록 ${fmt(content.userUploads)} · 승인 대기 ${fmt(content.pendingBlocks)}`} />
      </div>

      {newFeedback > 0 && (
        <button type="button" onClick={onOpenFeedback}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-pink-soft px-4 py-3 text-left text-sm font-bold text-pink-text hover:bg-pink hover:text-white">
          새 의견 {newFeedback}개가 기다리고 있어요 <span aria-hidden="true">→</span>
        </button>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">최근 14일</h2>
        <button type="button" className="chip px-3 py-1 text-xs" onClick={() => setTable((v) => !v)} aria-pressed={table}>
          {table ? '막대로 보기' : '표로 보기'}
        </button>
      </div>
      {table ? (
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 text-left font-semibold">날짜</th>
                {series.map((s) => <th key={s.key} className="px-4 py-2.5 text-right font-semibold">{s.title}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d, i) => (
                <tr key={d.date} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 text-muted">{dayLabel(d.date)}{i === 0 ? ' (오늘)' : ''}</td>
                  {series.map((s) => <td key={s.key} className="px-4 py-2 text-right">{d[s.key]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {series.map((s) => <MiniBars key={s.key} title={s.title} unit={s.unit} days={days} valueKey={s.key} />)}
        </div>
      )}
    </div>
  );
}

/** 숫자 칸: 이름 · 큰 숫자 · (선택) 늘어난 수 · 한 줄 설명 */
function Tile({ label, value, delta, deltaLabel, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{fmt(value)}</span>
        {deltaLabel && (
          <span className={`text-xs font-bold ${delta > 0 ? 'text-success' : 'text-faint'}`}>{deltaLabel} {delta > 0 ? `+${fmt(delta)}` : '0'}</span>
        )}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-faint">{sub}</p>
    </div>
  );
}

/**
 * 14일 작은 막대 (한 가지 숫자만, 오늘은 분홍·지난날은 흐리게).
 * 막대 위만 둥글게(4px), 막대 사이 2px, 막대에 마우스·키보드를 올리면 날짜와 숫자
 */
function MiniBars({ title, unit, days, valueKey }) {
  const [hover, setHover] = useState(null);
  const W = 280;
  const H = 72;
  const gap = 2;
  const barW = (W - gap * (days.length - 1)) / days.length;
  const max = Math.max(1, ...days.map((d) => d[valueKey]));
  const total = days.reduce((n, d) => n + d[valueKey], 0);
  const peak = Math.max(...days.map((d) => d[valueKey]));
  const shown = hover === null ? null : days[hover];

  return (
    <div className="card relative p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs text-muted">14일 {fmt(total)}{unit}</p>
      </div>
      <div className="relative mt-3">
        {shown && (
          <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line-strong bg-card-active px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}>
            <b className="text-sm text-ink">{shown[valueKey]}{unit}</b>
            <span className="ml-1.5 text-muted">{dayLabel(shown.date)}{hover === days.length - 1 ? ' 오늘' : ''}</span>
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-[72px] w-full" role="img"
          aria-label={`${title}: 최근 14일 합계 ${total}${unit}, 가장 많은 날 ${peak}${unit}`}>
          {days.map((d, i) => {
            const v = d[valueKey];
            const h = v === 0 ? 0 : Math.max(3, (v / max) * (H - 4));
            const x = i * (barW + gap);
            const r = Math.min(4, barW / 2, h);
            const today = i === days.length - 1;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path className={`${today ? 'fill-pink' : 'fill-faint'} ${hover === i ? 'opacity-80' : ''}`}
                    d={`M${x},${H} V${H - h + r} Q${x},${H - h} ${x + r},${H - h} H${x + barW - r} Q${x + barW},${H - h} ${x + barW},${H - h + r} V${H} Z`} />
                )}
                {/* 막대보다 넓은 투명 칸이 마우스·키보드를 받음 */}
                <rect x={x - gap / 2} y="0" width={barW + gap} height={H} fill="transparent" tabIndex={0}
                  aria-label={`${dayLabel(d.date)} ${v}${unit}`}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
              </g>
            );
          })}
          <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} className="stroke-line-strong" strokeWidth="1" />
        </svg>
        <div className="mt-1.5 flex justify-between text-[11px] text-faint">
          <span>{dayLabel(days[0].date)}</span>
          <span>오늘</span>
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
