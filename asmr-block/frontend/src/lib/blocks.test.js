import i18n from '../locales';
import en from '../locales/en.json';
import { categoryLabel, groupLabel } from './blocks';

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
});
