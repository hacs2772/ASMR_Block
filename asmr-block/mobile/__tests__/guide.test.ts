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
