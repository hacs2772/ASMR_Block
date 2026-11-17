import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import BlockLoader from '../brand/BlockLoader';

const fmt = (n) => (n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만` : n.toLocaleString('ko-KR'));
const dayLabel = (iso) => { const [, m, d] = iso.split('-'); return `${Number(m)}/${Number(d)}`; };

/** 관리자: 베타 반응 숫자 한눈에 (숫자 칸 + 최근 14일 작은 막대 셋 + 표로 보기) */
function StatsPanel({ onOpenFeedback, onOpenReports }) {
  const [stats, setStats] = useState(null);
  const [table, setTable] = useState(false);
  const [funnelDays, setFunnelDays] = useState(14);

  useEffect(() => {
    adminApi.stats(funnelDays).then(setStats).catch((e) => { toast.error(errorMessage(e)); setStats(false); });
  }, [funnelDays]);
  if (stats === null) return <BlockLoader small label="불러오는 중" />;
  if (!stats) return <p className="card p-8 text-center text-sm text-muted">숫자를 불러오지 못했어요.</p>;

  const { people, activity, content, newFeedback, days, funnel } = stats;
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

      <SampleBar />
      {stats.disk && <DiskBar disk={stats.disk} onCleaned={() => adminApi.stats(funnelDays).then(setStats).catch(() => {})} />}
      {stats.storage && <StorageLine storage={stats.storage} />}
      {stats.ai && <AiLine ai={stats.ai} />}
      {stats.sleep && (
        <p className="mt-1 px-1 text-xs text-muted" data-testid="sleep-line">
          <b className="text-ink">잠 기록</b> 최근 14일 {stats.sleep.rated}번 · 😴 잘 잤어요 {stats.sleep.good} · 😐 그저 그래요 {stats.sleep.okay} · 😣 못 잤어요 {stats.sleep.bad}
        </p>
      )}

      {stats.openReports > 0 && (
        <button type="button" onClick={onOpenReports} data-testid="stats-reports"
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-pink-soft px-4 py-3 text-left text-sm font-bold text-pink-text hover:bg-pink hover:text-white">
          새 신고 {stats.openReports}건이 있어요. 들어 보고 처리해 주세요 <span aria-hidden="true">→</span>
        </button>
      )}
      {newFeedback > 0 && (
        <button type="button" onClick={onOpenFeedback}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-pink-soft px-4 py-3 text-left text-sm font-bold text-pink-text hover:bg-pink hover:text-white">
          새 의견 {newFeedback}개가 기다리고 있어요 <span aria-hidden="true">→</span>
        </button>
      )}

      {funnel && <Funnel funnel={funnel} days={funnelDays} onDays={setFunnelDays} />}

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

const gb = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)}GB` : `${mb}MB`);

/** 서버 디스크 (올린 소리·완성본이 저장되는 회사 PC 디스크): 남은 공간, 완성본 크기, 오래된 완성본 정리 */
function DiskBar({ disk, onCleaned }) {
  const [busy, setBusy] = useState(false);
  const cleanup = async () => {
    setBusy(true);
    try {
      const res = await adminApi.cleanup();
      toast.success(res.data.freedMb > 0 ? `${res.message} (${gb(res.data.freedMb)} 비움)` : res.message);
      onCleaned?.();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const usedPct = disk.totalMb > 0 ? Math.round(((disk.totalMb - disk.freeMb) / disk.totalMb) * 100) : 0;
  return (
    <div className={`card mt-3 flex flex-wrap items-center gap-3 p-4 ${disk.low ? 'border-warn' : ''}`} data-testid="disk-bar">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-bold">
          서버 디스크 <span className={disk.low ? 'text-warn' : 'text-muted'}>남은 공간 {gb(disk.freeMb)}</span>
          <span className="text-faint"> / {gb(disk.totalMb)}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-active" aria-hidden="true">
          <div className={`h-full rounded-full ${disk.low ? 'bg-warn' : 'bg-pink'}`} style={{ width: `${usedPct}%` }} />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {disk.low ? '공간이 얼마 안 남았어요. 오래된 완성본을 정리하거나 PC 디스크를 비워 주세요. ' : ''}
          완성본(합친 소리) {gb(disk.rendersMb)} · 30일 넘게 안 들은 건 매일 새벽 저절로 정리돼요 (다시 들으면 다시 만들어짐)
        </p>
      </div>
      <button type="button" className="btn-line btn-sm" onClick={cleanup} disabled={busy} data-testid="cleanup">
        {busy ? '정리하는 중…' : '오래된 완성본 정리'}
      </button>
    </div>
  );
}

/**
 * 파일 저장소: 이 PC(local) 또는 클라우드(Cloudflare R2, s3). 클라우드로 바꾼 뒤에는 옛 파일 옮기기 상태
 * (docs/r2_guide.md: .env.public 에 R2 키를 넣고 재시작하면 바뀜)
 */
function StorageLine({ storage }) {
  const cloud = storage.type === 's3';
  const left = storage.pending;
  return (
    <p className="mt-2 px-1 text-xs leading-relaxed text-muted" data-testid="storage-line">
      <b className="text-ink">파일 저장소</b>{' '}
      {cloud ? (
        <>
          클라우드 (버킷 {storage.bucket})
          {storage.total > 0 && (
            <> · 옛 파일 옮기기 {storage.done}/{storage.total}
              {storage.running ? ' (옮기는 중… 그동안은 옛 파일로 재생돼요)' : left > 0 ? ` · ${left}개 남음(다음에 켤 때 다시)` : ' · 끝'}
              {storage.failed > 0 && <span className="text-warn"> · 실패 {storage.failed}</span>}
            </>
          )}
        </>
      ) : '이 PC 디스크 (클라우드로 옮기려면 docs/r2_guide.md)'}
    </p>
  );
}

/** AI 조합 (오늘 밤 조합의 한 줄 → Claude API): 켜졌는지 · 오늘/이번 달 횟수 · 대략 요금 (키는 .env.public, docs/ai_guide.md) */
function AiLine({ ai }) {
  return (
    <p className="mt-1 px-1 text-xs leading-relaxed text-muted" data-testid="ai-line">
      <b className="text-ink">AI 조합</b>{' '}
      {ai.enabled ? (
        <>
          켜짐 ({ai.model}) · 오늘 {ai.todayCalls}번 · 이번 달 {ai.monthCalls}번
          {ai.monthFailed > 0 && <span className="text-warn"> (실패 {ai.monthFailed})</span>}
          {' '}· 대략 ${ai.monthUsd.toFixed(2)} (약 {ai.monthKrw.toLocaleString()}원)
          {' '}· 하루 한도 한 사람 {ai.dailyPerUser}번 / 전체 {ai.dailyTotal}번
        </>
      ) : (
        <>꺼짐 — 한 줄은 낱말로 찾아 쌓아요 (켜려면 docs/ai_guide.md{ai.monthCalls > 0 ? ` · 이번 달 ${ai.monthCalls}번 썼음` : ''})</>
      )}
    </p>
  );
}

/**
 * 샘플 블록·샘플 조합 한꺼번에 숨기기/다시 보이기 (진짜 블록이 모이면).
 * 숨겨도 이미 담은 사람의 블록함·조합에서는 그대로 들을 수 있음
 */
function SampleBar() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { adminApi.samples().then(setS).catch(() => setS(false)); }, []);
  if (!s || s.blocks + s.combos === 0) return null;

  const toggle = async () => {
    const next = !s.visible;
    if (!next && !window.confirm('샘플 블록과 샘플 조합을 상점·추천 조합에서 숨길까요?\n이미 담은 사람은 그대로 들을 수 있고, 언제든 다시 보이게 할 수 있어요.')) return;
    setBusy(true);
    try {
      const res = await adminApi.setSamples(next);
      setS(res.data);
      toast.success(res.message);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mt-3 flex flex-wrap items-center gap-3 p-4" data-testid="sample-bar">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-bold">
          샘플 블록 {s.blocks}개 · 샘플 조합 {s.combos}개{' '}
          <span className={s.visible ? 'text-muted' : 'text-warn'}>{s.visible ? '· 상점에 보이는 중' : '· 숨김'}</span>
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          상점에 진짜 블록 {s.realBlocks}개.{' '}
          {s.visible
            ? (s.realBlocks >= 10 ? '진짜 블록이 충분해요. 샘플을 숨겨도 좋아요.' : '진짜 블록이 10개쯤 모이면 샘플을 숨기는 걸 추천해요.')
            : '상점·추천 조합에서만 빠졌고, 이미 담은 사람은 그대로 들어요.'}
        </p>
      </div>
      <button type="button" className={s.visible ? 'btn-line btn-sm' : 'btn-pink btn-sm'} onClick={toggle} disabled={busy}
        data-testid="sample-toggle">
        {busy ? '바꾸는 중…' : s.visible ? '샘플 숨기기' : '샘플 다시 보이기'}
      </button>
    </div>
  );
}

const FUNNEL_DAYS = [7, 14, 30];
const pct = (n, of) => (of > 0 ? Math.round((n / of) * 100) : 0);

/**
 * 어디서 그만두나요: 최근 N일 안에 들어온 사람이 각 단계까지 간 비율 (단계마다 따로 셈, 막대 하나 = 한 단계).
 * 앞 단계보다 가장 많이 줄어든 곳에 표시. "다시 옴"은 어제까지 들어온 사람 중 비율
 */
function Funnel({ funnel, days, onDays }) {
  const f = funnel;
  const steps = [
    { key: 'joined', title: '들어옴', note: '가입·베타 손님', value: f.joined, of: f.joined },
    { key: 'collected', title: '블록을 직접 담음', note: '처음 받은 블록 빼고', value: f.collected, of: f.joined },
    { key: 'hasCombo', title: '내 조합이 생김', note: `직접 만듦 ${f.madeCombo} · 추천 조합 담음 ${f.collectedCombo}`, value: f.hasCombo, of: f.joined },
    { key: 'listened', title: '조합을 틀어 봄', value: f.listened, of: f.joined },
    { key: 'listened10m', title: '10분 넘게 들음', note: '잠들 때까지 들었는지', value: f.listened10m, of: f.joined },
    { key: 'cameBack', title: '다음 날 이후 다시 옴', note: `어제까지 들어온 ${f.canComeBack}명 중`, value: f.cameBack, of: f.canComeBack },
  ];
  // 앞 단계보다 가장 많이 줄어든 곳 (들어옴~10분, 5명 이상일 때만)
  let worst = null;
  if (f.joined >= 5) {
    let drop = 0;
    for (let i = 1; i < 5; i += 1) {
      const d = steps[i - 1].value - steps[i].value;
      if (d > drop) { drop = d; worst = steps[i].key; }
    }
  }

  return (
    <section className="mt-8" data-testid="funnel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">어디서 그만두나요?</h2>
        <div className="flex gap-1.5">
          {FUNNEL_DAYS.map((d) => (
            <button key={d} type="button" className={`chip px-3 py-1 text-xs ${days === d ? 'chip-on' : ''}`} onClick={() => onDays(d)}
              aria-pressed={days === d}>최근 {d}일</button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">최근 {f.days}일 안에 들어온 사람이 어디까지 써 봤는지예요. 단계마다 따로 세서, 앞 단계보다 많을 수도 있어요.</p>
      <div className="card mt-3 divide-y divide-line">
        {steps.map((s) => {
          const p = pct(s.value, s.of);
          return (
            <div key={s.key} className="px-4 py-3" data-testid={`funnel-${s.key}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[180px_minmax(0,1fr)_96px]">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{s.title}</p>
                {s.note && <p className="truncate text-[11px] text-faint">{s.note}</p>}
              </div>
              <p className="text-right text-sm [font-variant-numeric:tabular-nums] sm:order-last">
                <b>{fmt(s.value)}명</b> <span className="text-muted">{s.key === 'joined' ? '' : `${p}%`}</span>
              </p>
              <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-card-active sm:col-span-1" aria-hidden="true">
                <div className="h-full rounded-full bg-pink" style={{ width: `${s.of > 0 ? Math.max(s.value > 0 ? 2 : 0, p) : 0}%` }} />
              </div>
              </div>
              {worst === s.key && (
                <p className="mt-1.5 text-[11px] font-bold text-warn sm:pl-[196px]">↑ 앞 단계에서 여기로 올 때 가장 많이 그만둬요</p>
              )}
            </div>
          );
        })}
      </div>
      {f.joined < 5 && <p className="mt-2 text-[11px] text-faint">아직 사람이 적어서 비율이 크게 흔들려요. 10명쯤 모이면 볼 만해져요.</p>}
    </section>
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
