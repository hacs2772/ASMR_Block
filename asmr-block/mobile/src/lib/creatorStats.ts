import i18n from '@/locales';

/**
 * 블록 판매 탭 "내 블록 통계" 막대그래프 계산·글 (웹 lib/creatorStats.js와 같은 규칙, 사전 cstats.* 글자까지 같음).
 * days = 서버 GET /me/uploads/stats 의 최근 14일 [{ date: "2026-11-17", collects, plays }] (오래된 날부터)
 */
export type StatsMetric = 'collects' | 'plays';
export type StatsDay = { date: string; collects: number; plays: number };

export const METRICS: StatsMetric[] = ['collects', 'plays'];

/** 0보다 큰 날은 아주 작아도 보이게 (가장 큰 날의 6%) */
const MIN_HEIGHT = 0.06;

/** 막대: 값 · 높이(0~1, 가장 큰 날 = 1) · 가장 큰 날(같으면 최근, 다 0이면 -1) · 합계 */
export function barsOf(days: StatsDay[] | null | undefined, metric: StatsMetric) {
  const values = (days ?? []).map((d) => Math.max(0, Number(d?.[metric]) || 0));
  const max = values.length ? Math.max(...values) : 0;
  let maxIndex = -1;
  values.forEach((v, i) => { if (v > 0 && v === max) maxIndex = i; });
  return {
    values,
    heights: values.map((v) => (max > 0 && v > 0 ? Math.max(MIN_HEIGHT, v / max) : 0)),
    max,
    maxIndex,
    total: values.reduce((a, b) => a + b, 0),
  };
}

/** 아래에 날짜를 적을 칸: 처음 · 가운데 · 마지막(오늘) */
export function ticksOf(n: number): number[] {
  if (n <= 0) return [];
  if (n < 3) return Array.from({ length: n }, (_, i) => i);
  return [0, Math.floor((n - 1) / 2), n - 1];
}

/** "2026-11-17" → "11월 17일" / "Nov 17" */
export function dayLabel(iso: string): string {
  const [y, m, d] = String(iso).split('-').map(Number);
  return i18n.language === 'en'
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d))
    : i18n.t('cstats.date', { month: m, day: d });
}

/** 막대를 눌렀을 때: "11월 17일 · 2명이 담음" */
export function tipOf(iso: string, metric: StatsMetric, value: number): string {
  return i18n.t(metric === 'plays' ? 'cstats.tipPlays' : 'cstats.tipCollects', { date: dayLabel(iso), count: value });
}

/** 올린 블록 한 줄: "담은 사람 3명 · 조합 1개 · 이번 주 +2" (0인 것은 빼고, 다 0이면 빈 글자) */
export function uploadLine(u: { collectedCount?: number; usedInCombos?: number; newCollects?: number } | null | undefined): string {
  const parts: string[] = [];
  if ((u?.collectedCount ?? 0) > 0) parts.push(i18n.t('cstats.rowCollected', { count: u!.collectedCount }));
  if ((u?.usedInCombos ?? 0) > 0) parts.push(i18n.t('cstats.rowCombos', { count: u!.usedInCombos }));
  if ((u?.newCollects ?? 0) > 0) parts.push(i18n.t('cstats.rowWeek', { count: u!.newCollects }));
  return parts.join(' · ');
}
