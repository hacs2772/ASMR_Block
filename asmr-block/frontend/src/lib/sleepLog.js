import i18n from '../locales';

/**
 * 잠 기록 글·그림 (앱 lib/sleepLog.ts와 같은 규칙, 사전 sleepLog.* 글자까지 같음).
 * rating: 3 잘 잤어요 · 2 그저 그래요 · 1 못 잤어요 · 0 건너뜀
 */
export const RATINGS = [
  { value: 3, emoji: '😴', key: 'good' },
  { value: 2, emoji: '😐', key: 'okay' },
  { value: 1, emoji: '😣', key: 'bad' },
];

export const ratingOf = (value) => RATINGS.find((r) => r.value === value) || null;

/** "2026-11-16" → "11월 16일 밤" / "Night of Nov 16" */
export function nightLabel(night) {
  const [y, m, d] = String(night).split('-').map(Number);
  const date = i18n.language === 'en'
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(y, m - 1, d))
    : i18n.t('sleepLog.date', { month: m, day: d });
  return i18n.t('sleepLog.night', { date });
}

/** 요일 짧게: "월" / "Mon" */
export function weekdayOf(night) {
  const [y, m, d] = String(night).split('-').map(Number);
  return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'ko-KR', { weekday: 'short' }).format(new Date(y, m - 1, d));
}

/** 들은 시간: 0 → "틀었어요", 30 → "30분 넘게 들었어요", 120 → "2시간 넘게 들었어요" */
export function listenedLabel(minutes) {
  if (!minutes) return i18n.t('sleepLog.played');
  const time = minutes >= 60 ? i18n.t('time.hours', { count: Math.floor(minutes / 60) }) : i18n.t('time.minutes', { count: minutes });
  return i18n.t('sleepLog.over', { time });
}

/** 답한 뒤 한 줄 */
export const thanksOf = (value) => i18n.t(value === 3 ? 'sleepLog.thanksGood' : value === 1 ? 'sleepLog.thanksBad' : 'sleepLog.thanksOkay');

/** 들은 시간 칸(좁아서 짧게, 넘은 단계의 합이라 "+"): 0 → "–", 30 → "30분+", 130 → "2시간+" / "2 hr+" */
export function listenedShort(minutes) {
  if (!minutes) return '–';
  const time = minutes >= 60 ? i18n.t('time.hours', { count: Math.floor(minutes / 60) }) : i18n.t('time.minutes', { count: minutes });
  return i18n.t('sleepLog.overShort', { time });
}

/** 이번 주 리포트: 잘 잔 밤을 지난주와 비교한 한 줄 (지난주 기록이 하나도 없으면 빈 글자). trend = up · down · same */
export function compareOf(report) {
  if (!report || (report.prevRated === 0 && report.prevPlayedNights === 0)) return null;
  const diff = report.good - report.prevGood;
  if (diff > 0) return { trend: 'up', text: i18n.t('sleepLog.vsMore', { count: diff }) };
  if (diff < 0) return { trend: 'down', text: i18n.t('sleepLog.vsLess', { count: -diff }) };
  return { trend: 'same', text: i18n.t('sleepLog.vsSame') };
}

/** 잘 잤던 조합 한 줄: "잘 잔 밤 2번 · 마지막 11월 15일 밤" */
export const goodComboLine = (g) => `${i18n.t('sleepLog.goodNights', { count: g.goodNights })} · ${i18n.t('sleepLog.lastGood', { night: nightLabel(g.lastNight) })}`;
