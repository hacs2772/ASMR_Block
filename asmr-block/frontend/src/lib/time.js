/**
 * 서버 시간 글자 → Date. 서버는 UTC로 저장하고 끝에 시간대 표시가 없으면 UTC로 봄
 * (그냥 new Date()하면 한국에서 9시간 이르게 보임)
 */
export function serverTime(value) {
  if (!value) return null;
  const s = String(value);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

/** 얼마 전 글자 (언어별). 웹 lib/time.js · 앱 lib/time.ts 같음 */
const AGO = {
  ko: { now: '방금', min: '분 전', hour: '시간 전', day: '일 전' }, // i18n-ok
  en: { now: 'just now', min: 'm ago', hour: 'h ago', day: 'd ago' },
};

/** "방금 · 5분 전 · 3시간 전 · 2일 전 · 11월 3일" (영어: "just now · 5m ago · 3h ago · 2d ago · Nov 3") */
export function ago(value, now = Date.now(), lang = 'ko') {
  const d = value instanceof Date ? value : serverTime(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  const w = AGO[lang] || AGO.ko;
  const sec = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (sec < 60) return w.now;
  if (sec < 3600) return `${Math.floor(sec / 60)}${w.min}`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}${w.hour}`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}${w.day}`;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' });
}

/** 관리자 목록용 "26. 11. 16. 오후 1:10" (한국 시간) */
export const shortDateTime = (value) =>
  serverTime(value)?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) ?? '';
