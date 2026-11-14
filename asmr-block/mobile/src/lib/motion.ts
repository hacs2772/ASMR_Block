/**
 * 편집기 움직임 계산 (순수 함수, jest로 테스트)
 * - 끄는 블록 기울기, 놓일 자리 비교, 블록함 높이 맞추기
 */

export type DropPreview = { row: 'main'; index: number } | { row: 'mix'; start: number } | { row: 'box' } | null;

/** 놓일 자리가 바뀌었는지 (같으면 화면을 다시 그리지 않음 → 끌기가 부드러워짐) */
export function samePreview(a: DropPreview, b: DropPreview): boolean {
  if (a === b) return true;
  if (!a || !b || a.row !== b.row) return false;
  if (a.row === 'main' && b.row === 'main') return a.index === b.index;
  if (a.row === 'mix' && b.row === 'mix') return a.start === b.start;
  return true; // 둘 다 box
}

export const MAX_TILT_DEG = 9;

/** 손가락이 옆으로 움직인 만큼(dx px) 끄는 블록을 살짝 기울임. 빨리 끌수록 더 기울고 최대 ±9도 */
export function tiltFor(dx: number): number {
  const deg = dx * 0.8;
  return Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, Math.round(deg * 10) / 10));
}

/** 블록함 높이 단계: 작게 · 중간 · 크게 (화면 높이 기준, 크게여도 바닥판 첫째 줄은 보이게) */
export function boxSnapPoints(screenHeight: number): number[] {
  const small = 220;
  const medium = Math.max(small + 60, Math.round(screenHeight * 0.42));
  const large = Math.max(medium + 60, Math.round(screenHeight * 0.62));
  return [small, medium, large];
}

/**
 * 손을 뗐을 때 블록함 높이: 가장 가까운 단계로. 위/아래로 휙 밀었으면(속도) 그 방향 다음 단계로.
 * velocityY: 아래로 + / 위로 - (px/s). 위로 밀면 커짐
 */
export function snapBoxHeight(height: number, velocityY: number, points: number[]): number {
  const sorted = [...points].sort((a, b) => a - b);
  const FLICK = 600;
  if (velocityY < -FLICK) return sorted.find((p) => p > height + 8) ?? sorted[sorted.length - 1];
  if (velocityY > FLICK) return [...sorted].reverse().find((p) => p < height - 8) ?? sorted[0];
  return sorted.reduce((best, p) => (Math.abs(p - height) < Math.abs(best - height) ? p : best), sorted[0]);
}

/** 블록함 손잡이를 누르면: 가장 작으면 크게, 아니면 작게 */
export function toggleBoxHeight(height: number, points: number[]): number {
  const sorted = [...points].sort((a, b) => a - b);
  return height <= sorted[0] + 8 ? sorted[sorted.length - 1] : sorted[0];
}
