/**
 * "오래 들음" 재기: 재생 중인 시간(시계 기준)을 모아 단계(10분·30분·1시간·2시간·4시간·8시간)를 넘을 때마다 알려 줌 (웹 lib/listen.js와 같음).
 * 10분 = 관리자 통계 "잠들 때까지 들었는지", 그 뒤 단계 = 잠 기록 "얼마나 들었는지".
 * 화면이 꺼져 타이머가 멈춰도, 다시 확인할 때 재생 중이던 시간까지 셈. 멈춘 동안은 세지 않음
 */
export const LISTEN_MINUTES = 10;
export const LISTEN_STEPS = [10, 30, 60, 120, 240, 480];

export type ListenMeter = {
  play: (now: number) => void;
  pause: (now: number) => void;
  listened: (now: number) => number;
  /** 새로 넘은 단계(분) — 한꺼번에 여러 단계를 넘었으면 가장 큰 것 하나, 없으면 0 */
  check: (now: number) => number;
};

export function createListenMeter(steps: number | number[] = LISTEN_STEPS): ListenMeter {
  const list = (Array.isArray(steps) ? steps : [steps]).slice().sort((a, b) => a - b);
  let total = 0;
  let since: number | null = null;
  let next = 0;
  const listened = (now: number) => total + (since !== null ? Math.max(0, now - since) : 0);
  return {
    play(now) { if (since === null) since = now; },
    pause(now) {
      if (since !== null) {
        total += Math.max(0, now - since);
        since = null;
      }
    },
    listened,
    check(now) {
      const ms = listened(now);
      let passed = 0;
      while (next < list.length && ms >= list[next] * 60000) {
        passed = list[next];
        next += 1;
      }
      return passed;
    },
  };
}
