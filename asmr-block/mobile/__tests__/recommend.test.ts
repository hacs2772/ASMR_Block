import en from '@/locales/en.json';
import i18n from '@/locales';
import { recommendLine, tasteNames } from '@/lib/recommend';

describe('추천 이유 한 줄 (웹 lib/recommend.js와 같은 규칙)', () => {
  afterEach(() => i18n.changeLanguage('ko'));

  it('취향으로 골랐으면 트리거 이름, 아직 모르면 요즘 인기 안내', async () => {
    const rec = { personalized: true, triggers: [{ code: 'tap', name: '탭핑·타건' }, { code: 'rain', name: '빗소리·물' }] };
    expect(tasteNames(rec)).toBe('탭핑·타건·빗소리·물');
    expect(recommendLine(rec)).toContain('탭핑·타건·빗소리·물');
    expect(recommendLine({ personalized: false, triggers: [] })).toContain('요즘 인기 블록');
    expect(recommendLine({ personalized: false, triggers: [] }, 'combos')).toContain('요즘 뜨는 조합');
    expect(recommendLine(null)).toBe('');
    await i18n.changeLanguage('en');
    expect(tasteNames(rec)).toBe(`${en.cat.tap}·${en.cat.rain}`);
    expect(recommendLine({ personalized: true, triggers: [{ code: 'tap', name: 'Tap tap' }] })).toContain('Tap tap');
  });
});
