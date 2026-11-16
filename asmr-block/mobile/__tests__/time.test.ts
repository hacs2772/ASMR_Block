/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { ago, serverTime } from '@/lib/time';

describe('서버 시간 (알림 "5분 전")', () => {
  it('시간대 표시가 없으면 UTC로 봄, Z·+09:00은 그대로', () => {
    expect(serverTime('2026-11-16T04:10:00')!.toISOString()).toBe('2026-11-16T04:10:00.000Z');
    expect(serverTime('2026-11-16T13:10:00+09:00')!.toISOString()).toBe('2026-11-16T04:10:00.000Z');
    expect(serverTime(null)).toBeNull();
  });

  it('얼마 전: 방금 · 분 · 시간 · 일 · 날짜', () => {
    const now = Date.parse('2026-11-16T04:10:00Z');
    expect(ago('2026-11-16T04:09:30Z', now)).toBe('방금');
    expect(ago('2026-11-16T04:05:00Z', now)).toBe('5분 전');
    expect(ago('2026-11-16T01:10:00', now)).toBe('3시간 전');
    expect(ago('2026-11-14T04:10:00Z', now)).toBe('2일 전');
  });

  it('웹 lib/time.js와 계산이 글자까지 같음', () => {
    const strip = (src: string) => src
      .replace(/\/\*\*[\s\S]*?\*\//g, '')
      .replace(/: Record<string, \{ now: string; min: string; hour: string; day: string \}>/g, '')
      .replace(/: (string \| Date \| null \| undefined|string \| null \| undefined|number|string|Date \| null)(?=[,)=\s{])/g, '')
      .replace(/\s+/g, '');
    const app = readFileSync(join(__dirname, '../src/lib/time.ts'), 'utf8');
    const web = readFileSync(join(__dirname, '../../frontend/src/lib/time.js'), 'utf8');
    expect(strip(app)).toBe(strip(web));
  });
});
