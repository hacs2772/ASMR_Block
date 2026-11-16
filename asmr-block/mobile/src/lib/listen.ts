/**
 * "오래 들음" 재기: 재생 중인 시간(시계 기준)을 모아 minutes분을 넘으면 한 번만 알려 줌 (웹 lib/listen.js와 같음).
 * 화면이 꺼져 타이머가 멈춰도, 다시 확인할 때 재생 중이던 시간까지 셈. 멈춘 동안은 세지 않음
 */
export const LISTEN_MINUTES = 10;

export type ListenMeter = {
  play: (now: number) => void;
  pause: (now: number) => void;
  listened: (now: number) => number;
  check: (now: number) => boolean;
};

export function createListenMeter(minutes = LISTEN_MINUTES): ListenMeter {
  let total = 0;
  let since: number | null = null;
  let sent = false;
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
      if (sent || listened(now) < minutes * 60000) return false;
      sent = true;
      return true;
    },
  };
}
