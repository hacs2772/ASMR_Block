/**
 * 블록 카드에 그리는 소리 파형 (진짜 음원 분석이 아니라 트리거 종류마다 다른 "모양").
 * 같은 블록은 항상 같은 모양이 나오도록 seed(블록 id)로 고정. 웹 시안과 같은 규칙.
 */
export type WaveGroup =
  | 'tap' | 'scratch' | 'crinkle' | 'whisper' | 'slime' | 'cut' | 'rain' | 'nature' | 'place' | 'noise';

const GROUPS: readonly string[] = ['tap', 'scratch', 'crinkle', 'whisper', 'slime', 'cut', 'rain', 'nature', 'place', 'noise'];

export function waveGroupOf(groupCode: string | null | undefined): WaveGroup {
  return (groupCode && GROUPS.includes(groupCode) ? groupCode : 'noise') as WaveGroup;
}

/** 0~1 사이 막대 높이 n개 */
export function waveData(group: WaveGroup, seed: number, n: number): number[] {
  let s = (seed * 7919 + 13) % 2147483647;
  if (s <= 0) s += 2147483646;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i / n;
    let v: number;
    switch (group) {
      case 'tap': v = i % 5 === 0 ? 0.45 + r() * 0.5 : 0.06 + r() * 0.06; break;
      case 'scratch': v = 0.25 + r() * 0.35 + 0.15 * Math.sin(x * 30); break;
      case 'crinkle': v = r() < 0.3 ? 0.35 + r() * 0.6 : 0.1 + r() * 0.15; break;
      case 'whisper': v = 0.05 + 0.4 * Math.max(0, Math.sin(x * Math.PI * 6 + seed)) ** 2 + r() * 0.08; break;
      case 'slime': v = r() < 0.18 ? 0.4 + r() * 0.45 : 0.12 + r() * 0.1; break;
      case 'cut': v = i % 7 < 2 ? 0.5 + r() * 0.45 : 0.08 + r() * 0.08; break;
      case 'rain': v = 0.3 + r() * 0.4; break;
      case 'nature': v = 0.12 + 0.45 * (Math.sin(x * Math.PI * 2.6 + seed) * 0.5 + 0.5) + r() * 0.12; break;
      case 'place': v = i % 10 < 2 ? 0.55 + r() * 0.3 : 0.1 + r() * 0.12; break;
      default: v = 0.4 + r() * 0.14;
    }
    out.push(Math.min(1, Math.max(0.06, v)));
  }
  return out;
}
