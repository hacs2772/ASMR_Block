import { ago, serverTime } from './time';

describe('서버 시간', () => {
  it('시간대 표시가 없으면 UTC로 봄, Z·+09:00은 그대로', () => {
    expect(serverTime('2026-11-16T04:10:00').toISOString()).toBe('2026-11-16T04:10:00.000Z');
    expect(serverTime('2026-11-16T04:10:00Z').toISOString()).toBe('2026-11-16T04:10:00.000Z');
    expect(serverTime('2026-11-16T13:10:00+09:00').toISOString()).toBe('2026-11-16T04:10:00.000Z');
    expect(serverTime(null)).toBeNull();
  });

  it('얼마 전: 방금 · 분 · 시간 · 일 · 날짜', () => {
    const now = Date.parse('2026-11-16T04:10:00Z');
    expect(ago('2026-11-16T04:09:30Z', now)).toBe('방금');
    expect(ago('2026-11-16T04:05:00Z', now)).toBe('5분 전');
    expect(ago('2026-11-16T01:10:00', now)).toBe('3시간 전');
    expect(ago('2026-11-14T04:10:00Z', now)).toBe('2일 전');
    expect(ago('2026-11-01T04:10:00Z', now)).toMatch(/^11월 1일$/);
  });

  it('영어: just now · 5m ago · 3h ago · 2d ago · Nov 1', () => {
    const now = Date.parse('2026-11-16T04:10:00Z');
    expect(ago('2026-11-16T04:09:30Z', now, 'en')).toBe('just now');
    expect(ago('2026-11-16T04:05:00Z', now, 'en')).toBe('5m ago');
    expect(ago('2026-11-16T01:10:00', now, 'en')).toBe('3h ago');
    expect(ago('2026-11-14T04:10:00Z', now, 'en')).toBe('2d ago');
    expect(ago('2026-11-01T04:10:00Z', now, 'en')).toBe('Nov 1');
  });
});
