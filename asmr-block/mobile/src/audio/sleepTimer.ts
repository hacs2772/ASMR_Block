/** 수면 타이머: 끝나기 전 FADE_MS 동안 볼륨을 서서히 줄이고, 끝나면 멈춤 */
export const FADE_MS = 30_000;

/** 수면 타이머 선택지(분). 밤새 듣는 사람을 위해 8시간까지 */
export const SLEEP_OPTIONS_MIN = [15, 30, 60, 120, 240, 480] as const;

export function sleepOptionLabel(minutes: number): string {
  return minutes < 60 ? `${minutes}분` : `${minutes / 60}시간`;
}

/** 남은 시간(ms)에 따른 볼륨 (0 ~ baseVolume) */
export function sleepTimerVolume(remainingMs: number, baseVolume = 1, fadeMs = FADE_MS): number {
  if (remainingMs <= 0) return 0;
  if (remainingMs >= fadeMs) return baseVolume;
  return Math.round(baseVolume * (remainingMs / fadeMs) * 1000) / 1000;
}

/** "12:05 남음" 표시용 */
export function formatRemaining(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
