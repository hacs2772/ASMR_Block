import en from '@/locales/en.json';
import i18n from '@/locales';
import { categoryLabel, groupDescription, groupLabel, stickerName } from '@/lib/labels';
import { shareLinks } from '@/lib/share';

// 서버 블록 응답의 category 모양 (소분류 + groupCode · parentName) — 웹 lib/blocks.test.js와 같은 경우
const sub = { name: '탭핑', code: 'tap.tapping', groupCode: 'tap', parentName: '탭핑·타건' };

describe('화면 이름 (영어판 3단계: 서버 영어 이름)', () => {
  afterEach(() => i18n.changeLanguage('ko'));

  it('한국어는 서버 이름 그대로', () => {
    expect(groupLabel(sub)).toBe('탭핑·타건');
    expect(categoryLabel(sub)).toBe('탭핑');
    expect(stickerName({ code: 'moon1', name: '보름달', nameEn: 'Full moon' })).toBe('보름달');
  });

  it('영어: 서버가 영어 이름을 주면(관리자가 적은 것) 그것, 한국어면(바꾸기 전에 받은 것) 사전', async () => {
    await i18n.changeLanguage('en');
    expect(groupLabel(sub)).toBe(en.cat.tap);
    expect(categoryLabel(sub)).toBe(en.cat.tap__tapping);
    expect(groupLabel({ ...sub, parentName: 'Tap tap' })).toBe('Tap tap');
    expect(categoryLabel({ ...sub, name: 'Fingertips' })).toBe('Fingertips');
    expect(groupLabel({ code: 'new.thing', groupCode: 'new', parentName: 'New group' })).toBe('New group');
    expect(groupLabel({ code: 'new.thing', groupCode: 'new', parentName: '새 묶음' })).toBe('새 묶음');
    expect(groupDescription({ code: 'tap', description: '탭핑 설명' })).toBe(en.catDesc.tap);
    expect(groupDescription({ code: 'tap', description: 'Taps' })).toBe('Taps');
  });

  it('스티커: 영어면 nameEn → 사전 → 한국어 이름', async () => {
    await i18n.changeLanguage('en');
    expect(stickerName({ code: 'moon1', name: '보름달', nameEn: 'Full moon' })).toBe('Full moon');
    expect(stickerName({ code: 'flagjp', name: '일본' })).toBe(en.stickers.flagjp);
    expect(stickerName({ code: 'moon2', name: '반달', nameEn: null })).toBe('반달');
  });

  it('공유 링크: 영어 화면이면 ?lang=en (미리보기·받은 사람 화면이 영어)', async () => {
    expect(shareLinks.combo(3)).toBe('https://asmrblock.com/s/3');
    await i18n.changeLanguage('en');
    expect(shareLinks.combo(3)).toBe('https://asmrblock.com/s/3?lang=en');
    expect(shareLinks.block(7)).toBe('https://asmrblock.com/s/b/7?lang=en');
    expect(shareLinks.creator(9)).toBe('https://asmrblock.com/s/c/9?lang=en');
  });
});
