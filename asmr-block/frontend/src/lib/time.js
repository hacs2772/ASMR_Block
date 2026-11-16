/**
 * 서버 시간 글자 → Date. 서버는 UTC로 저장하고 끝에 시간대 표시가 없으면 UTC로 봄
 * (그냥 new Date()하면 한국에서 9시간 이르게 보임)
 */
export function serverTime(value) {
  if (!value) return null;
  const s = String(value);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

/** "방금 · 5분 전 · 3시간 전 · 2일 전 · 11월 3일" */
export function ago(value, now = Date.now()) {
  const d = value instanceof Date ? value : serverTime(value);
  if (!d || Number.isNaN(d.getTime())) return '';
  const sec = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}일 전`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 관리자 목록용 "26. 11. 16. 오후 1:10" (한국 시간) */
export const shortDateTime = (value) =>
  serverTime(value)?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) ?? '';
