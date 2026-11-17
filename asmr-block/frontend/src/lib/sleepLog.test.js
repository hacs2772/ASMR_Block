import i18n from '../locales';
import { listenedLabel, nightLabel, ratingOf, RATINGS, thanksOf, weekdayOf } from './sleepLog';

describe('잠 기록 글 (앱 lib/sleepLog.ts와 같은 규칙)', () => {
  afterAll(() => i18n.changeLanguage('ko'));

  it('한국어: 밤 이름 · 요일 · 들은 시간 · 답한 뒤 한 줄', async () => {
    await i18n.changeLanguage('ko');
    expect(nightLabel('2026-11-16')).toBe('11월 16일 밤');
    expect(weekdayOf('2026-11-16')).toBe('월');
    expect(listenedLabel(0)).toBe('틀었어요');
    expect(listenedLabel(30)).toBe('30분 넘게 들었어요');
    expect(listenedLabel(130)).toBe('2시간 넘게 들었어요');
    expect(thanksOf(3)).toMatch(/^좋아요!/);
    expect(thanksOf(1)).toMatch(/^아쉬워요/);
    expect(thanksOf(2)).toBe('고마워요. 기록해 둘게요.');
  });

  it('영어 · 답 세 가지(잘 잤어요 → 못 잤어요)', async () => {
    await i18n.changeLanguage('en');
    expect(nightLabel('2026-11-16')).toBe('Night of Nov 16');
    expect(weekdayOf('2026-11-16')).toBe('Mon');
    expect(listenedLabel(60)).toBe('Listened over 1 hr');
    expect(RATINGS.map((r) => r.value)).toEqual([3, 2, 1]);
    expect(ratingOf(0)).toBeNull();
    expect(ratingOf(3).emoji).toBe('😴');
  });
});
