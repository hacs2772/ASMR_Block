import { create } from 'zustand';
import type { EditorBlock, TrackKey } from '@/store/editor';

/**
 * 드래그 중인 블록 상태 (블록 상자 → 타임라인, 타임라인 안에서 이동)
 * 좌표는 모두 화면(window) 기준 절대 좌표.
 */
export type DragSource =
  | { kind: 'palette'; block: EditorBlock }
  | { kind: 'item'; key: string; track: TrackKey; block: EditorBlock; repeat: number };

export type DropPreview = { track: TrackKey; seconds: number; insertIndex?: number } | null;

type DragState = {
  source: DragSource | null;
  /** 손가락 위치 */
  x: number;
  y: number;
  /** 블록 안에서 잡은 위치 (블록 왼쪽 위 기준) */
  grabX: number;
  grabY: number;
  /** 드래그 중인 블록의 화면상 폭 */
  width: number;
  preview: DropPreview;
  start: (source: DragSource, x: number, y: number, grabX: number, grabY: number, width: number) => void;
  move: (x: number, y: number, preview: DropPreview) => void;
  end: () => void;
};

export const useDrag = create<DragState>((set) => ({
  source: null,
  x: 0,
  y: 0,
  grabX: 0,
  grabY: 0,
  width: 0,
  preview: null,
  start: (source, x, y, grabX, grabY, width) => set({ source, x, y, grabX, grabY, width, preview: null }),
  move: (x, y, preview) => set({ x, y, preview }),
  end: () => set({ source: null, preview: null }),
}));
