import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { insertIndexAtX, PX_PER_SECOND, snapMixStart, useEditor, type EditorBlock } from '@/store/editor';
import { BRICK_HEIGHT, MIX_BRICK_HEIGHT } from './Brick';

/**
 * 끌어다 놓기. 좌표는 모두 화면(window) 기준 절대 좌표.
 * - new: 블록 상자 → 첫째 줄(원하는 자리) / 둘째 줄(원하는 시간)
 * - main: 첫째 줄 안에서 순서 바꾸기, 블록 상자로 끌면 빼기
 * - mix: 둘째 줄 안에서 시간 옮기기, 블록 상자로 끌면 빼기
 */
export type DragSource =
  | { kind: 'new'; block: EditorBlock }
  | { kind: 'main'; key: string; block: EditorBlock }
  | { kind: 'mix'; key: string; block: EditorBlock };

export type DropPreview = { row: 'main'; index: number } | { row: 'mix'; start: number } | { row: 'box' } | null;

type DragState = {
  source: DragSource | null;
  x: number;
  y: number;
  /** 블록 안에서 잡은 위치 (블록 왼쪽 위 기준) */
  grabX: number;
  grabY: number;
  width: number;
  height: number;
  preview: DropPreview;
  start: (source: DragSource, x: number, y: number, grabX: number, grabY: number, width: number, height: number) => void;
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
  height: 0,
  preview: null,
  start: (source, x, y, grabX, grabY, width, height) => set({ source, x, y, grabX, grabY, width, height, preview: null }),
  move: (x, y, preview) => set({ x, y, preview }),
  end: () => set({ source: null, preview: null }),
}));

/** 가로 스크롤 위치 (전체 보기 슬라이더가 따라 그림) */
export const useBoardScroll = create<{ x: number; width: number }>(() => ({ x: 0, width: 0 }));

// 바닥판 안 줄 위치 (스크롤 영역 맨 위 기준, 고정 값)
export const BOARD_PAD = 12;
export const RULER_HEIGHT = 18;
export const MAIN_TOP = RULER_HEIGHT + 10;
export const LANE_LABEL_HEIGHT = 20;
export const LANE_TOP = MAIN_TOP + BRICK_HEIGHT + 8 + LANE_LABEL_HEIGHT;
export const LANE_HEIGHT = MIX_BRICK_HEIGHT + 4;

/** 바닥판(가로 스크롤 영역)과 블록 상자의 화면 위치. 각 컴포넌트가 기록해 둠 */
export const board = {
  viewport: { x: 0, y: 0, width: 0 },
  box: { x: 0, y: Number.MAX_SAFE_INTEGER, width: 0 },
  scrollX: 0,
  measure: () => {},
  measureBox: () => {},
  scrollTo: (_x: number) => {},
  scrollToEnd: () => {},

  /** 화면 x → 바닥판 안 x(px, 0 = 첫 블록 왼쪽) */
  contentX(absX: number) {
    return absX - this.viewport.x + this.scrollX - BOARD_PAD;
  },

  zoneAt(absX: number, absY: number): 'main' | 'mix' | 'box' | null {
    if (absY >= this.box.y && absX >= this.box.x && absX <= this.box.x + this.box.width) return 'box';
    const v = this.viewport;
    if (absX < v.x - 24 || absX > v.x + v.width + 24) return null;
    const y = absY - v.y;
    const mixOn = useEditor.getState().mix.enabled;
    if (mixOn && y >= LANE_TOP - 16 && y <= LANE_TOP + LANE_HEIGHT + 28) return 'mix';
    if (y >= MAIN_TOP - 28 && y <= MAIN_TOP + BRICK_HEIGHT + (mixOn ? 10 : 28)) return 'main';
    return null;
  },

  hitTest(source: DragSource, absX: number, absY: number, grabX: number, previous: DropPreview): DropPreview {
    const zone = this.zoneAt(absX, absY);
    const editor = useEditor.getState();
    if (zone === 'box') return source.kind === 'new' ? null : { row: 'box' };
    if (zone === 'main' && source.kind !== 'mix') {
      const exclude = source.kind === 'main' ? source.key : undefined;
      return { row: 'main', index: insertIndexAtX(editor.main.items, this.contentX(absX), exclude) };
    }
    if (zone === 'mix' && source.kind !== 'main') {
      const raw = this.contentX(absX - grabX) / PX_PER_SECOND;
      const exclude = source.kind === 'mix' ? source.key : undefined;
      return { row: 'mix', start: snapMixStart(raw, source.block.duration, editor.main.items, editor.mix.items, exclude) };
    }
    // 끌던 블록이 잠깐 줄 밖으로 나가도 놓일 자리는 유지 (블록 상자에서 끌어온 건 취소)
    return source.kind === 'new' || previous?.row === 'box' ? null : previous;
  },

  /** 가장자리 근처로 끌면 자동으로 옆으로 스크롤 */
  autoScroll(absX: number) {
    const edge = 44;
    const v = this.viewport;
    if (absX > v.x + v.width - edge) this.scrollTo(this.scrollX + Math.ceil((absX - (v.x + v.width - edge)) / 3));
    else if (absX < v.x + edge && this.scrollX > 0) this.scrollTo(Math.max(0, this.scrollX - Math.ceil((v.x + edge - absX) / 3)));
  },
};

function commit(source: DragSource, preview: DropPreview) {
  if (!preview) return;
  const editor = useEditor.getState();
  if (preview.row === 'box') {
    if (source.kind !== 'new') editor.remove(source.key);
  } else if (source.kind === 'new') {
    if (preview.row === 'main') editor.addMain(source.block, preview.index);
    else editor.addMix(source.block, preview.start);
  } else if (source.kind === 'main' && preview.row === 'main') {
    editor.moveMain(source.key, preview.index);
  } else if (source.kind === 'mix' && preview.row === 'mix') {
    editor.moveMix(source.key, preview.start);
  }
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** 드래그 시작/이동/놓기 (바닥판 블록과 블록 상자 블록이 같이 씀) */
export function useDragHandlers() {
  const start = useDrag((s) => s.start);
  const move = useDrag((s) => s.move);
  const end = useDrag((s) => s.end);

  return {
    onStart: (source: DragSource, absX: number, absY: number, grabX: number, grabY: number, width: number, height: number) => {
      board.measure();
      board.measureBox();
      useEditor.getState().select(null);
      start(source, absX, absY, grabX, grabY, width, height);
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
    },
    onMove: (absX: number, absY: number) => {
      const { source, grabX, preview } = useDrag.getState();
      if (!source) return;
      board.autoScroll(absX);
      move(absX, absY, board.hitTest(source, absX, absY, grabX, preview));
    },
    onEnd: (canceled: boolean) => {
      const { source, preview } = useDrag.getState();
      if (source && !canceled) commit(source, preview);
      end();
    },
  };
}
