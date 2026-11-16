/**
 * 업로드 "구간 고르기" 계산 (앱 mobile/src/lib/trim.ts와 같은 규칙, 둘 다 jest).
 * 구간 = { start, end } (초). 길이는 min~max(10초~20분), 0.1초 단위. 서버는 앞뒤 FADE_SECONDS를 부드럽게 처리
 */
export const FADE_SECONDS = 0.5;
/** 전체를 고른 것으로 보는 오차 (이만큼 안쪽이면 자르지 않음) */
export const WHOLE_EPSILON = 0.05;

const tenth = (t) => Math.round(t * 10) / 10;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** 처음 구간: 전체 (최대 길이보다 길면 앞에서부터 최대 길이만큼) */
export function initialRange(duration, max) {
  return { start: 0, end: Math.min(duration, max) };
}

/** 고를 수 있는 파일인지 (최소 길이보다 짧으면 못 고름) */
export const canTrim = (duration, min) => duration >= min;

/**
 * 손잡이 옮기기. which: 'start' | 'end' | 'move'(구간 통째로, time = 새 시작)
 * 시작은 끝보다 min 앞까지, 끝은 시작보다 min 뒤 ~ 파일 끝, 길이는 max까지
 */
export function moveHandle(range, which, time, { duration, min, max }) {
  if (!canTrim(duration, min)) return { start: 0, end: duration };
  const t = tenth(time);
  if (which === 'start') {
    return { start: clamp(t, Math.max(0, range.end - max), range.end - min), end: range.end };
  }
  if (which === 'end') {
    return { start: range.start, end: clamp(t, range.start + min, Math.min(duration, range.start + max)) };
  }
  const length = range.end - range.start;
  const start = clamp(t, 0, duration - length);
  return { start, end: start + length };
}

/** 화면 위치(x, 0~width) → 시간 */
export const timeAt = (x, width, duration) => (width > 0 ? clamp((x / width) * duration, 0, duration) : 0);

/** 눌린 곳에서 더 가까운 손잡이 */
export const nearestHandle = (range, time) => (Math.abs(time - range.start) <= Math.abs(time - range.end) ? 'start' : 'end');

/** 서버로 보낼 값: 전체를 골랐으면 null(자르지 않음) */
export function trimParams(range, duration) {
  if (!range) return null;
  if (range.start <= WHOLE_EPSILON && range.end >= duration - WHOLE_EPSILON) return null;
  const ms = (t) => Math.round(t * 1000) / 1000;
  return { trimStart: ms(range.start), trimEnd: ms(range.end) };
}

/** 화면 너비에 맞춰 파형 칸 수 줄이기 (칸마다 가장 큰 값) */
export function fitPeaks(peaks, bars) {
  if (!peaks?.length || bars >= peaks.length) return peaks ?? [];
  const out = [];
  for (let i = 0; i < bars; i += 1) {
    const from = Math.floor((i * peaks.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * peaks.length) / bars));
    let m = 0;
    for (let j = from; j < to; j += 1) m = Math.max(m, peaks[j]);
    out.push(m);
  }
  return out;
}

/** 0:42.5 처럼 (분:초.0.1초) */
export function clock(seconds) {
  const s = Math.max(0, tenth(seconds));
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${rest}`;
}
