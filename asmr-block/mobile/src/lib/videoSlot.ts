import type { PlaylistDetail, TrackItem } from '@/api/types';

/** "영상도 같이 보기"에서 지금 보여 줄 블록 고르기 (순수 함수, jest 테스트) */
export type Slot = { key: string; start: number; length: number; item: TrackItem };

/** 첫째 줄(반복 펼침)과 레이어드를 [시작, 길이, 블록]으로 */
function slotsOf(p: PlaylistDetail) {
  let t = 0;
  const main: Slot[] = (p.main?.items ?? []).flatMap((it) => Array.from({ length: it.repeat }, (_, n) => {
    const slot = { key: `${it.position}-${n}`, start: t, length: it.duration, item: it };
    t += it.duration;
    return slot;
  }));
  const mix: Slot[] = (p.mix?.items ?? []).flatMap((it) => Array.from({ length: it.repeat }, (_, n) => ({
    key: `m${it.position}-${n}`, start: (it.startSeconds ?? 0) + n * it.duration, length: it.duration, item: it,
  })));
  return { main, mix };
}

/** t초에 보여 줄 블록: 첫째 줄 블록, 그 블록에 영상이 없고 레이어드 블록에 영상이 있으면 레이어드 쪽 */
export function slotAt(p: PlaylistDetail, t: number): Slot | null {
  const { main, mix } = slotsOf(p);
  const m = main.find((s) => t >= s.start && t < s.start + s.length);
  const x = mix.find((s) => t >= s.start && t < s.start + s.length);
  if (m?.item.design?.videoUrl || !x?.item.design?.videoUrl) return m ?? x ?? null;
  return x;
}

