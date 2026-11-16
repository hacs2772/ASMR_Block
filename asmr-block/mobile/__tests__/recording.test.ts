/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS } from '@/lib/recording';

describe('녹음 가이드', () => {
  it('웹 lib/recording.js와 내용이 글자까지 같음 (첫 설명·타입 표시 빼고)', () => {
    const strip = (src: string) => src
      .replace(/^\/\*\*[\s\S]*?\*\//, '')
      .replace(/^export type .*$/gm, '')
      .replace(/: (RecordingCheck|RecordingSection|string)\[\]/g, '')
      .replace(/\s+/g, '');
    const app = readFileSync(join(__dirname, '../src/lib/recording.ts'), 'utf8');
    const web = readFileSync(join(__dirname, '../../frontend/src/lib/recording.js'), 'utf8');
    expect(strip(app)).toBe(strip(web));
  });

  it('휴대폰 한 화면에 읽히는 길이, 이름이 겹치지 않음', () => {
    for (const s of RECORDING_SECTIONS) {
      expect(s.title.length).toBeLessThanOrEqual(14);
      for (const p of s.points) expect(p.length).toBeLessThanOrEqual(80);
    }
    for (const c of RECORDING_CHECKLIST) expect(c.text.length).toBeLessThanOrEqual(40);
    expect(new Set(RECORDING_CHECKLIST.map((c) => c.key)).size).toBe(RECORDING_CHECKLIST.length);
    expect(new Set(RECORDING_SECTIONS.map((s) => s.key)).size).toBe(RECORDING_SECTIONS.length);
    expect(RECORDING_DONTS.length).toBeGreaterThan(0);
  });
});

describe('녹음 가이드 영어판', () => {
  it('웹 lib/recording.en.js와 글자까지 같고, 한국어 원문과 항목·순서가 같음', () => {
    const strip = (src: string) => src
      .replace(/^\/\*\*[\s\S]*?\*\//, '')
      .replace(/^import type .*$/gm, '')
      .replace(/: (RecordingCheck|RecordingSection|string)\[\]/g, '')
      .replace(/\s+/g, '');
    const app = readFileSync(join(__dirname, '../src/lib/recording.en.ts'), 'utf8');
    const web = readFileSync(join(__dirname, '../../frontend/src/lib/recording.en.js'), 'utf8');
    expect(strip(app)).toBe(strip(web));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const en = require('@/lib/recording.en') as typeof import('@/lib/recording.en');
    expect(en.RECORDING_CHECKLIST_EN.map((c) => c.key)).toEqual(RECORDING_CHECKLIST.map((c) => c.key));
    expect(en.RECORDING_SECTIONS_EN.map((s) => [s.key, s.points.length])).toEqual(RECORDING_SECTIONS.map((s) => [s.key, s.points.length]));
    expect(en.RECORDING_DONTS_EN.length).toBe(RECORDING_DONTS.length);
    expect(/[가-힣]/.test(JSON.stringify(en))).toBe(false);
  });
});
