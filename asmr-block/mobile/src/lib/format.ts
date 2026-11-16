import i18n from '@/locales';

/** 초 → "3:05" / "1:02:03" */
export function formatDuration(totalSeconds: number | null | undefined): string {
  const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 초 → "18분" / "1시간 5분" (영어 "18 min" / "1 hr 5 min") */
export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return i18n.t('time.minutes', { count: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = i18n.t('time.hours', { count: h });
  return m === 0 ? hours : `${hours} ${i18n.t('time.minutes', { count: m })}`;
}
