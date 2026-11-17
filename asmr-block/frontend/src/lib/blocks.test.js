import i18n from '../locales';
import en from '../locales/en.json';
import { categoryLabel, groupDescription, groupLabel } from './blocks';
import { stickerName } from './stickers';

// 서버 블록 응답의 category 모양 (소분류 + groupCode · parentName)
const sub = { id: 42, name: '탭핑', code: 'tap.tapping', groupCode: 'tap', parentId: 2, parentName: '탭핑·타건' };
const group = { id: 2, name: '탭핑·타건', code: 'tap' };

describe('분류 이름 (화면 언어)', () => {
  afterEach(() => i18n.changeLanguage('ko'));

  it('한국어는 서버 이름 그대로', () => {
    expect(groupLabel(sub)).toBe('탭핑·타건');
    expect(categoryLabel(sub)).toBe('탭핑');
    expect(groupLabel(group)).toBe('탭핑·타건');
  });

  it('영어는 코드로 사전에서 (블록 카드·묶음·판매 미리보기 모양 모두)', async () => {
    await i18n.changeLanguage('en');
    expect(groupLabel(sub)).toBe(en.cat.tap);
    expect(groupLabel({ ...sub, groupCode: undefined })).toBe(en.cat.tap);
    expect(groupLabel({ ...group, parentName: group.name })).toBe(en.cat.tap);
    expect(groupLabel(group)).toBe(en.cat.tap);
    expect(categoryLabel(sub)).toBe(en.cat.tap__tapping);
    // 관리자가 새로 만든 분류(사전에 없음)는 서버 이름
    expect(groupLabel({ code: 'new.thing', groupCode: 'new', parentName: '새 묶음' })).toBe('새 묶음');
  });

  it('영어: 서버가 영어 이름을 주면(관리자가 적은 것) 그것, 한국어면(바꾸기 전에 받은 것) 사전', async () => {
    await i18n.changeLanguage('en');
    expect(groupLabel({ ...sub, parentName: 'Tap tap' })).toBe('Tap tap');
    expect(categoryLabel({ ...sub, name: 'Fingertips' })).toBe('Fingertips');
    expect(groupLabel({ code: 'new.thing', groupCode: 'new', parentName: 'New group' })).toBe('New group');
    expect(groupDescription({ code: 'tap', description: '탭핑 설명' })).toBe(en.catDesc.tap);
    expect(groupDescription({ code: 'tap', description: 'Taps' })).toBe('Taps');
  });

  it('스티커 이름: 영어면 nameEn → 사전 → 한국어 이름, 한국어면 이름 그대로', async () => {
    const custom = { code: 'moon1', name: '보름달', nameEn: 'Full moon' };
    expect(stickerName(custom)).toBe('보름달');
    await i18n.changeLanguage('en');
    expect(stickerName(custom)).toBe('Full moon');
    expect(stickerName({ code: 'flagjp', name: '일본' })).toBe(en.stickers.flagjp);
    expect(stickerName({ code: 'moon2', name: '반달' })).toBe('반달');
  });
});

describe('추천 이유 한 줄', () => {
  // eslint-disable-next-line global-require
  const { recommendLine, tasteNames } = require('./recommend');
  afterEach(() => i18n.changeLanguage('ko'));

  it('취향으로 골랐으면 트리거 이름, 아직 모르면 요즘 인기 안내', async () => {
    const rec = { personalized: true, triggers: [{ code: 'tap', name: '탭핑·타건' }, { code: 'rain', name: '빗소리·물' }] };
    expect(tasteNames(rec)).toBe('탭핑·타건, 빗소리·물');
    expect(recommendLine(rec)).toContain('탭핑·타건, 빗소리·물');
    expect(recommendLine({ personalized: false, triggers: [] })).toContain('요즘 인기 블록');
    expect(recommendLine({ personalized: false, triggers: [] }, 'combos')).toContain('요즘 뜨는 조합');
    expect(recommendLine(null)).toBe('');
    await i18n.changeLanguage('en');
    expect(tasteNames(rec)).toBe(`${en.cat.tap}, ${en.cat.rain}`);
    expect(recommendLine({ personalized: true, triggers: [{ code: 'tap', name: 'Tap tap' }] })).toContain('Tap tap');
  });
});
