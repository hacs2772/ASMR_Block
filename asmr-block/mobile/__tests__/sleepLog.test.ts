import i18n from '@/locales';
import { listenedLabel, nightLabel, ratingOf, RATINGS, thanksOf, weekdayOf } from '@/lib/sleepLog';
import webKo from '../../frontend/src/locales/ko.json';
import webEn from '../../frontend/src/locales/en.json';
import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

describe('잠 기록 글 (웹 lib/sleepLog.js와 같은 규칙)', () => {
  afterAll(() => i18n.changeLanguage('ko'));

  it('한국어: 밤 이름 · 요일 · 들은 시간 · 답한 뒤 한 줄', async () => {
    await i18n.changeLanguage('ko');
    expect(nightLabel('2026-11-16')).toBe('11월 16일 밤');
    expect(weekdayOf('2026-11-16')).toBe('월');
    expect(listenedLabel(0)).toBe('틀었어요');
    expect(listenedLabel(30)).toBe('30분 넘게 들었어요');
    expect(listenedLabel(130)).toBe('2시간 넘게 들었어요');
    expect(thanksOf(2)).toBe('고마워요. 기록해 둘게요.');
  });

  it('영어 · 답 세 가지', async () => {
    await i18n.changeLanguage('en');
    expect(nightLabel('2026-11-16')).toBe('Night of Nov 16');
    expect(listenedLabel(60)).toBe('Listened over 1 hr');
    expect(RATINGS.map((r) => r.value)).toEqual([3, 2, 1]);
    expect(ratingOf(0)).toBeNull();
  });

  it('사전의 sleepLog 글은 웹과 글자까지 같음', () => {
    expect((ko as Record<string, unknown>).sleepLog).toEqual((webKo as Record<string, unknown>).sleepLog);
    expect((en as Record<string, unknown>).sleepLog).toEqual((webEn as Record<string, unknown>).sleepLog);
  });
});
