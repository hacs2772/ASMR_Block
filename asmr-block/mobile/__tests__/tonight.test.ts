import i18n from '@/locales';
import { mixSummary, tonightDoneMessage, tonightExamples } from '@/lib/tonight';
import webKo from '../../frontend/src/locales/ko.json';
import webEn from '../../frontend/src/locales/en.json';
import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

describe('오늘 밤 조합 안내 (웹 lib/tonight.js와 같은 규칙)', () => {
  beforeAll(() => i18n.changeLanguage('ko'));

  const result = {
    source: 'AI' as const,
    note: null,
    main: [{ code: 'crinkle', name: '바스락', percent: 75 }, { code: 'tap', name: '탭핑·타건', percent: 25 }],
    layer: [{ code: 'rain', name: '빗소리·물', percent: 100 }],
  };

  it('들어간 트리거: 첫째 줄은 비율과 함께, 둘째 줄은 + 뒤에', () => {
    expect(mixSummary(result)).toBe('바스락 75% · 탭핑·타건 25% + 빗소리·물');
    expect(mixSummary({ main: [{ code: 'tap', name: '탭핑', percent: 100 }], layer: [] })).toBe('탭핑');
  });

  it('어떻게 정했는지 한 줄 (note가 먼저)', () => {
    expect(tonightDoneMessage(result)).toBe('AI가 쌓았어요 · 바스락 75% · 탭핑·타건 25% + 빗소리·물');
    expect(tonightDoneMessage({ ...result, source: 'WORDS', note: 'AI_LIMIT' })).toMatch(/^오늘 AI 횟수를 다 써서/);
    expect(tonightDoneMessage({ ...result, source: 'TASTE', note: 'NO_MATCH' })).toMatch(/^말한 소리를 못 찾아서/);
    expect(tonightDoneMessage({ ...result, source: 'STARTER', note: null })).toMatch(/^내 취향대로/);
    expect(tonightExamples()).toHaveLength(4);
  });

  it('사전의 tonight 글은 웹과 글자까지 같음', () => {
    expect((ko as Record<string, unknown>).tonight).toEqual((webKo as Record<string, unknown>).tonight);
    expect((en as Record<string, unknown>).tonight).toEqual((webEn as Record<string, unknown>).tonight);
  });
});
