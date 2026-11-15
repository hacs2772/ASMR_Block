/**
 * 잠들기 타이머 ("얼마나 들을까요?") 계산.
 * 화면이 꺼지면 휴대폰이 타이머를 늦추거나 멈출 수 있어서, 시계(Date.now)와 끝나는 시각(endsAt)만으로 판단함.
 * → 재생 중 오는 timeupdate, 0.5초 타이머, 화면으로 돌아왔을 때 어디서 불러도 같은 답
 */
export const FADE_SECONDS = 20;

/**
 * endsAt(ms)까지 남은 시간으로 지금 할 일.
 * - stop: 끝났으니 멈춤 (화면이 꺼져 늦게 알아챘어도 바로 멈춤)
 * - volume: 마지막 20초는 점점 작게 (아이폰 브라우저는 소리 크기 조절을 무시해서 그냥 끝에 멈춤)
 * - fading: 마지막 20초 안인지 (영상 끄기 등)
 */
export function sleepStep(endsAt, now) {
  if (!endsAt) return { stop: false, volume: 1, fading: false, left: null };
  const left = (endsAt - now) / 1000;
  if (left <= 0) return { stop: true, volume: 0, fading: true, left: 0 };
  if (left < FADE_SECONDS) return { stop: false, volume: Math.max(0.02, left / FADE_SECONDS), fading: true, left };
  return { stop: false, volume: 1, fading: false, left };
}

/** 잠금화면 재생 위치: 브라우저가 거절하지 않게 숫자가 올바를 때만 */
export function positionState(currentTime, duration) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return null;
  return { duration, position: Math.min(Math.max(0, currentTime), duration), playbackRate: 1 };
}
