/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { canTrim, clock, fitPeaks, initialRange, moveHandle, nearestHandle, timeAt, trimParams } from '@/lib/trim';

const rules = { duration: 600, min: 10, max: 1200 };

describe('구간 고르기', () => {
  it('처음엔 전체, 20분이 넘으면 앞 20분', () => {
    expect(initialRange(600, 1200)).toEqual({ start: 0, end: 600 });
    expect(initialRange(1500, 1200)).toEqual({ start: 0, end: 1200 });
  });

  it('시작 손잡이: 0 아래로, 끝보다 10초 안쪽으로는 못 감. 0.1초 단위', () => {
    const r = { start: 0, end: 200 };
    expect(moveHandle(r, 'start', 42.37, rules)).toEqual({ start: 42.4, end: 200 });
    expect(moveHandle(r, 'start', -5, rules)).toEqual({ start: 0, end: 200 });
    expect(moveHandle(r, 'start', 199, rules)).toEqual({ start: 190, end: 200 });
  });

  it('끝 손잡이: 시작보다 10초 뒤 ~ 파일 끝', () => {
    const r = { start: 100, end: 200 };
    expect(moveHandle(r, 'end', 105, rules)).toEqual({ start: 100, end: 110 });
    expect(moveHandle(r, 'end', 900, rules)).toEqual({ start: 100, end: 600 });
  });

  it('최대 20분: 긴 파일에서 끝을 늘리거나 시작을 당기면 20분까지만', () => {
    const long = { duration: 3000, min: 10, max: 1200 };
    expect(moveHandle({ start: 100, end: 500 }, 'end', 2000, long)).toEqual({ start: 100, end: 1300 });
    expect(moveHandle({ start: 1500, end: 1800 }, 'start', 0, long)).toEqual({ start: 600, end: 1800 });
  });

  it('구간 통째로 옮기기: 길이는 그대로, 파일 안에서만', () => {
    const r = { start: 100, end: 280 };
    expect(moveHandle(r, 'move', 300, rules)).toEqual({ start: 300, end: 480 });
    expect(moveHandle(r, 'move', 550, rules)).toEqual({ start: 420, end: 600 });
    expect(moveHandle(r, 'move', -20, rules)).toEqual({ start: 0, end: 180 });
  });

  it('10초보다 짧은 파일은 고를 수 없음', () => {
    expect(canTrim(8, 10)).toBe(false);
    expect(moveHandle({ start: 0, end: 8 }, 'start', 3, { duration: 8, min: 10, max: 1200 })).toEqual({ start: 0, end: 8 });
  });

  it('위치 → 시간, 가까운 손잡이', () => {
    expect(timeAt(150, 300, 600)).toBe(300);
    expect(timeAt(-10, 300, 600)).toBe(0);
    expect(timeAt(400, 300, 600)).toBe(600);
    expect(nearestHandle({ start: 100, end: 300 }, 150)).toBe('start');
    expect(nearestHandle({ start: 100, end: 300 }, 250)).toBe('end');
  });

  it('전체를 고르면 자르지 않음(null), 아니면 시작·끝', () => {
    expect(trimParams({ start: 0, end: 600 }, 600)).toBeNull();
    expect(trimParams({ start: 0.02, end: 599.97 }, 600)).toBeNull();
    expect(trimParams({ start: 42.4, end: 234.1 }, 600)).toEqual({ trimStart: 42.4, trimEnd: 234.1 });
    expect(trimParams(null, 600)).toBeNull();
  });

  it('파형 칸 줄이기는 칸마다 가장 큰 값', () => {
    expect(fitPeaks([0.1, 0.9, 0.2, 0.3], 2)).toEqual([0.9, 0.3]);
    expect(fitPeaks([0.1, 0.2], 10)).toEqual([0.1, 0.2]);
    expect(fitPeaks(Array.from({ length: 400 }, (_, i) => i / 400), 100)).toHaveLength(100);
  });

  it('시계: 분:초.0', () => {
    expect(clock(42.37)).toBe('0:42.4');
    expect(clock(192)).toBe('3:12.0');
    expect(clock(5.04)).toBe('0:05.0');
  });
});

/** 웹과 같은 규칙인지: 두 파일의 계산 부분(타입 표시를 뺀 글자)이 같아야 함 */
describe('웹 lib/trim.js와 같은 규칙', () => {
  const strip = (src: string) => src
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/^export type .*$/gm, '')
    .replace(/: (TrimRange \| null|TrimRange|TrimRules|Handle|number\[\]( \| null \| undefined)?|number|string|'start' \| 'end'|\{ trimStart: number; trimEnd: number \} \| null)(?=[,)=;\s{])/g, '')
    .replace(/\s+/g, '');
  it('계산 함수가 글자까지 같음', () => {
    const app = readFileSync(join(__dirname, '../src/lib/trim.ts'), 'utf8');
    const web = readFileSync(join(__dirname, '../../frontend/src/lib/trim.js'), 'utf8');
    expect(strip(app)).toBe(strip(web));
  });
});
