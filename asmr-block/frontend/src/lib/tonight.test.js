import i18n from '../locales';
import { mixSummary, tonightDoneMessage, tonightExamples } from './tonight';

describe('오늘 밤 조합 안내', () => {
  beforeAll(() => i18n.changeLanguage('ko'));

  const result = {
    source: 'AI',
    note: null,
    main: [{ code: 'crinkle', name: '바스락', percent: 75 }, { code: 'tap', name: '탭핑·타건', percent: 25 }],
    layer: [{ code: 'rain', name: '빗소리·물', percent: 100 }],
  };

  it('들어간 트리거: 첫째 줄은 비율과 함께, 둘째 줄은 + 뒤에 (하나뿐이면 비율 없이)', () => {
    expect(mixSummary(result)).toBe('바스락 75% · 탭핑·타건 25% + 빗소리·물');
    expect(mixSummary({ main: [{ name: '바스락', percent: 100 }], layer: [] })).toBe('바스락');
  });

  it('어떻게 정했는지에 따라 알림 한 줄 (note가 source보다 먼저)', () => {
    expect(tonightDoneMessage(result)).toBe('AI가 쌓았어요 · 바스락 75% · 탭핑·타건 25% + 빗소리·물');
    expect(tonightDoneMessage({ ...result, source: 'WORDS', note: 'AI_FAILED' })).toMatch(/^AI가 잠깐 대답을 못 해서/);
    expect(tonightDoneMessage({ ...result, source: 'WORDS', note: 'AI_LIMIT' })).toMatch(/^오늘 AI 횟수를 다 써서/);
    expect(tonightDoneMessage({ ...result, source: 'TASTE', note: 'NO_MATCH' })).toMatch(/^말한 소리를 못 찾아서/);
    expect(tonightDoneMessage({ ...result, source: 'WORDS' })).toMatch(/^적은 말로 쌓았어요/);
    expect(tonightDoneMessage({ ...result, source: 'STARTER' })).toMatch(/^내 취향대로 쌓았어요/);
  });

  it('예시 네 개 (영어 화면이면 영어)', async () => {
    expect(tonightExamples()).toHaveLength(4);
    await i18n.changeLanguage('en');
    expect(tonightExamples()[0]).toBe('Reading in a café on a rainy day');
    await i18n.changeLanguage('ko');
  });
});
