import i18n from '../locales';
import { barsOf, dayLabel, ticksOf, tipOf, uploadLine } from './creatorStats';

const days = [
  { date: '2026-11-04', collects: 0, plays: 3 },
  { date: '2026-11-05', collects: 4, plays: 0 },
  { date: '2026-11-06', collects: 1, plays: 30 },
  { date: '2026-11-07', collects: 4, plays: 1 },
];

describe('내 블록 통계 (앱 lib/creatorStats.ts와 같은 규칙)', () => {
  afterAll(() => i18n.changeLanguage('ko'));

  it('막대 높이는 가장 큰 날 = 1, 같으면 최근 날이 가장 큰 날, 작은 값도 조금은 보임', () => {
    const c = barsOf(days, 'collects');
    expect(c.values).toEqual([0, 4, 1, 4]);
    expect(c.heights).toEqual([0, 1, 0.25, 1]);
    expect(c.maxIndex).toBe(3);
    expect(c.total).toBe(9);
    const p = barsOf(days, 'plays');
    expect(p.heights[3]).toBeCloseTo(0.06);
    expect(p.maxIndex).toBe(2);
  });

  it('다 0이거나 비어 있으면 가장 큰 날 없음', () => {
    expect(barsOf([{ date: '2026-11-04', collects: 0 }], 'collects')).toMatchObject({ max: 0, maxIndex: -1, total: 0, heights: [0] });
    expect(barsOf(null, 'plays')).toMatchObject({ values: [], maxIndex: -1, total: 0 });
  });

  it('날짜 칸: 처음 · 가운데 · 오늘', () => {
    expect(ticksOf(14)).toEqual([0, 6, 13]);
    expect(ticksOf(2)).toEqual([0, 1]);
    expect(ticksOf(0)).toEqual([]);
  });

  it('한국어 · 영어 글', async () => {
    await i18n.changeLanguage('ko');
    expect(dayLabel('2026-11-07')).toBe('11월 7일');
    expect(tipOf('2026-11-07', 'collects', 2)).toBe('11월 7일 · 2명이 담음');
    expect(tipOf('2026-11-07', 'plays', 5)).toBe('11월 7일 · 5번 들음');
    expect(uploadLine({ collectedCount: 3, usedInCombos: 1, newCollects: 2 })).toBe('담은 사람 3명 · 조합 1개 · 이번 주 +2');
    expect(uploadLine({ collectedCount: 0, usedInCombos: 0, newCollects: 0 })).toBe('');
    await i18n.changeLanguage('en');
    expect(dayLabel('2026-11-07')).toBe('Nov 7');
    expect(tipOf('2026-11-07', 'collects', 1)).toBe('Nov 7 · 1 new collector');
    expect(tipOf('2026-11-07', 'plays', 5)).toBe('Nov 7 · 5 plays');
    expect(uploadLine({ collectedCount: 1, usedInCombos: 2, newCollects: 1 })).toBe('1 collector · in 2 combos · +1 this week');
  });
});
