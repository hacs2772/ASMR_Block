/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { EDITOR_STEPS, FULL_STEPS, GUIDE_KEYS, WELCOME_STEPS, type GuideStep } from '@/lib/guide';

/** 웹 lib/guide.js 안의 안내 목록을 글자로 읽어 [그림, 제목] 순서대로 */
function webSteps(source: string, name: string) {
  const start = source.indexOf(`export const ${name} = [`);
  const body = source.slice(start, source.indexOf('\n];', start));
  return [...body.matchAll(/art: '(\w+)',\s*title: '([^']+)'/g)].map((m) => [m[1], m[2]]);
}
const pairs = (steps: GuideStep[]) => steps.map((s) => [s.art, s.title]);

describe('처음 사용법 안내', () => {
  const web = readFileSync(join(__dirname, '../../frontend/src/lib/guide.js'), 'utf8');

  it('앱과 웹의 순서·그림·제목이 같음 (설명은 메뉴 이름에 맞춰 다를 수 있음)', () => {
    expect(webSteps(web, 'WELCOME_STEPS')).toEqual(pairs(WELCOME_STEPS));
    expect(webSteps(web, 'EDITOR_STEPS')).toEqual(pairs(EDITOR_STEPS));
  });

  it('본 적 있는지 기억하는 이름도 같음 (바꾸면 모두에게 다시 뜸)', () => {
    expect(web).toContain(`welcome: '${GUIDE_KEYS.welcome}', editor: '${GUIDE_KEYS.editor}'`);
  });

  it('처음 안내는 담기 → 끌어서 쌓기 → 시간 → 듣기, 설명은 휴대폰 한 화면에 들어가는 길이', () => {
    expect(WELCOME_STEPS.map((s) => s.art)).toEqual(['collect', 'drag', 'time', 'sleep']);
    for (const s of [...WELCOME_STEPS, ...EDITOR_STEPS]) {
      expect(s.title.length).toBeLessThanOrEqual(16);
      expect(s.body.length).toBeLessThanOrEqual(110);
    }
  });

  it('다시 보기 = 처음 안내 + 고치는 법, 제목이 겹치지 않음', () => {
    expect(FULL_STEPS).toHaveLength(5);
    expect(new Set(FULL_STEPS.map((s) => s.title)).size).toBe(5);
    expect(FULL_STEPS[4].art).toBe('edit');
  });
});

describe('사용법 안내 영어판', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require('@/lib/guide.en') as typeof import('@/lib/guide.en');
  const webEn = readFileSync(join(__dirname, '../../frontend/src/lib/guide.en.js'), 'utf8');
  const webEnSteps = (name: string) => {
    const start = webEn.indexOf(`export const ${name} = [`);
    const body = webEn.slice(start, webEn.indexOf('\n];', start));
    return [...body.matchAll(/art: '(\w+)',\s*title: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  };

  it('한국어 원문과 순서·그림이 같고, 제목은 웹 영어판과 같음', () => {
    expect(en.WELCOME_STEPS_EN.map((s) => s.art)).toEqual(WELCOME_STEPS.map((s) => s.art));
    expect(en.EDITOR_STEPS_EN.map((s) => s.art)).toEqual(EDITOR_STEPS.map((s) => s.art));
    expect(en.FULL_STEPS_EN.map((s) => s.art)).toEqual(FULL_STEPS.map((s) => s.art));
    expect(webEnSteps('WELCOME_STEPS_EN')).toEqual(pairs(en.WELCOME_STEPS_EN));
    expect(webEnSteps('EDITOR_STEPS_EN')).toEqual(pairs(en.EDITOR_STEPS_EN));
  });

  it('영어만, 휴대폰 한 화면에 들어가는 길이', () => {
    for (const s of [...en.WELCOME_STEPS_EN, ...en.EDITOR_STEPS_EN]) {
      expect(/[가-힣]/.test(s.title + s.body)).toBe(false);
      expect(s.title.length).toBeLessThanOrEqual(34);
      expect(s.body.length).toBeLessThanOrEqual(190);
    }
  });
});
