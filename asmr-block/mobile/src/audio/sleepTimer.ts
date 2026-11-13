/** 수면 타이머: 끝나기 전 FADE_MS 동안 볼륨을 서서히 줄이고, 끝나면 멈춤 */
export const FADE_MS = 30_000;

export const SLEEP_OPTIONS_MIN = [15, 30, 45, 60, 90] as const;

/** 남은 시간(ms)에 따른 볼륨 (0 ~ baseVolume) */
export function sleepTimerVolume(remainingMs: number, baseVolume = 1, fadeMs = FADE_MS): number {
  if (remainingMs <= 0) return 0;
  if (remainingMs >= fadeMs) return baseVolume;
  return Math.round(baseVolume * (remainingMs / fadeMs) * 1000) / 1000;
}

/** "12:05 남음" 표시용 */
export function formatRemaining(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
