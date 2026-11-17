import i18n from '@/locales';
import { compareOf, goodComboLine, listenedShort, listenedLabel, nightLabel, ratingOf, RATINGS, thanksOf, weekdayOf } from '@/lib/sleepLog';
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
  it('이번 주 리포트: 들은 시간 칸 · 지난주와 비교 · 잘 잤던 조합 한 줄', async () => {
    await i18n.changeLanguage('ko');
    expect(listenedShort(0)).toBe('–');
    expect(listenedShort(30)).toBe('30분+');
    expect(listenedShort(250)).toBe('4시간+');
    expect(compareOf({ good: 3, prevGood: 1, prevRated: 2, prevPlayedNights: 1 })).toEqual({ trend: 'up', text: '잘 잔 밤이 지난주보다 2번 늘었어요' });
    expect(compareOf({ good: 1, prevGood: 2, prevRated: 2, prevPlayedNights: 0 })?.trend).toBe('down');
    expect(compareOf({ good: 2, prevGood: 2, prevRated: 3, prevPlayedNights: 3 })?.text).toBe('잘 잔 밤이 지난주와 같아요');
    expect(compareOf({ good: 2, prevGood: 0, prevRated: 0, prevPlayedNights: 0 })).toBeNull();
    expect(goodComboLine({ goodNights: 2, lastNight: '2026-11-15' })).toBe('잘 잔 밤 2번 · 마지막 11월 15일 밤');
    await i18n.changeLanguage('en');
    expect(listenedShort(130)).toBe('2 hr+');
    expect(compareOf({ good: 2, prevGood: 1, prevRated: 1, prevPlayedNights: 1 })?.text).toBe('1 more good night than last week');
    expect(compareOf({ good: 0, prevGood: 2, prevRated: 2, prevPlayedNights: 2 })?.text).toBe('2 fewer good nights than last week');
    expect(goodComboLine({ goodNights: 1, lastNight: '2026-11-15' })).toBe('Slept well 1 night · last: Night of Nov 15');
  });
});
