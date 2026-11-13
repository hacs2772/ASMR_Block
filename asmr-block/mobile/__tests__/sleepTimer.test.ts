import { FADE_MS, formatRemaining, sleepTimerVolume } from '@/audio/sleepTimer';

describe('수면 타이머', () => {
  it('끝나기 30초 전까지는 원래 볼륨, 그 뒤로 서서히 줄어 0', () => {
    expect(sleepTimerVolume(10 * 60_000)).toBe(1);
    expect(sleepTimerVolume(FADE_MS)).toBe(1);
    expect(sleepTimerVolume(FADE_MS / 2)).toBe(0.5);
    expect(sleepTimerVolume(0)).toBe(0);
    expect(sleepTimerVolume(-500)).toBe(0);
    expect(sleepTimerVolume(FADE_MS / 4, 0.8)).toBe(0.2);
  });

  it('남은 시간 표시', () => {
    expect(formatRemaining(15 * 60_000)).toBe('15:00');
    expect(formatRemaining(61_500)).toBe('1:02');
    expect(formatRemaining(-1)).toBe('0:00');
  });
});
