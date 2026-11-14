import * as Haptics from 'expo-haptics';
import { Animated, Platform } from 'react-native';
import { create } from 'zustand';
import { samePreview, tiltFor, type DropPreview } from '@/lib/motion';
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

export type { DropPreview };

/**
 * 끄는 중인 블록 정보. 손가락 위치(x, y)는 여기 넣지 않고 dragMotion(Animated)으로만 움직임
 * → 손가락이 움직일 때마다 화면 전체를 다시 그리지 않아 끌기가 부드러움.
 * preview(놓일 자리)도 바뀔 때만 바꿈
 */
type DragState = {
  source: DragSource | null;
  /** 블록 안에서 잡은 위치 (블록 왼쪽 위 기준) */
  grabX: number;
  grabY: number;
  width: number;
  height: number;
  preview: DropPreview;
  start: (source: DragSource, grabX: number, grabY: number, width: number, height: number) => void;
  setPreview: (preview: DropPreview) => void;
  end: () => void;
};

export const useDrag = create<DragState>((set, get) => ({
  source: null,
  grabX: 0,
  grabY: 0,
  width: 0,
  height: 0,
  preview: null,
  start: (source, grabX, grabY, width, height) => set({ source, grabX, grabY, width, height, preview: null }),
  setPreview: (preview) => { if (!samePreview(get().preview, preview)) set({ preview }); },
  end: () => set({ source: null, preview: null }),
}));

const NATIVE = Platform.OS !== 'web';

/** 끄는 블록의 움직임: 손가락 위치 · 들어 올림(0→1) · 기울기(도) */
export const dragMotion = {
  pos: new Animated.ValueXY({ x: 0, y: 0 }),
  lift: new Animated.Value(0),
  tilt: new Animated.Value(0),
  lastX: 0,
  settle: null as ReturnType<typeof setTimeout> | null,
};

/** 방금 놓은 블록: 그 블록이 딸깍 하고 살짝 튀어 오름 (nonce가 바뀔 때마다) */
export const useDropPop = create<{ key: string | null; nonce: number }>(() => ({ key: null, nonce: 0 }));

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
  /** 블록함을 키웠을 때 편집 화면을 바닥판까지 올려서 바닥판이 가려지지 않게 (편집기 화면이 채움) */
  revealBoard: () => {},

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
    // 새로 넣은 블록은 바닥판에 처음 나타날 때 위에서 딸깍 내려앉음 (Board)
    if (preview.row === 'main') editor.addMain(source.block, preview.index);
    else editor.addMix(source.block, preview.start);
  } else if (source.kind === 'main' && preview.row === 'main') {
    editor.moveMain(source.key, preview.index);
    useDropPop.setState((s) => ({ key: source.key, nonce: s.nonce + 1 }));
  } else if (source.kind === 'mix' && preview.row === 'mix') {
    editor.moveMix(source.key, preview.start);
    useDropPop.setState((s) => ({ key: source.key, nonce: s.nonce + 1 }));
  }
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

function springTilt(toValue: number) {
  Animated.spring(dragMotion.tilt, { toValue, speed: 40, bounciness: 6, useNativeDriver: NATIVE }).start();
}

/** 드래그 시작/이동/놓기 (바닥판 블록과 블록 상자 블록이 같이 씀) */
export function useDragHandlers() {
  const start = useDrag((s) => s.start);
  const setPreview = useDrag((s) => s.setPreview);
  const end = useDrag((s) => s.end);

  return {
    onStart: (source: DragSource, absX: number, absY: number, grabX: number, grabY: number, width: number, height: number) => {
      board.measure();
      board.measureBox();
      useEditor.getState().select(null);
      // 손가락 아래에서 블록을 쏙 들어 올림
      dragMotion.pos.setValue({ x: absX, y: absY });
      dragMotion.lastX = absX;
      dragMotion.tilt.setValue(0);
      dragMotion.lift.setValue(0);
      Animated.spring(dragMotion.lift, { toValue: 1, speed: 20, bounciness: 12, useNativeDriver: NATIVE }).start();
      start(source, grabX, grabY, width, height);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    },
    onMove: (absX: number, absY: number) => {
      const { source, grabX, preview } = useDrag.getState();
      if (!source) return;
      dragMotion.pos.setValue({ x: absX, y: absY });
      // 움직이는 쪽으로 살짝 기울었다가, 멈추면 바로 섬
      springTilt(tiltFor(absX - dragMotion.lastX));
      dragMotion.lastX = absX;
      if (dragMotion.settle) clearTimeout(dragMotion.settle);
      dragMotion.settle = setTimeout(() => springTilt(0), 90);
      board.autoScroll(absX);
      setPreview(board.hitTest(source, absX, absY, grabX, preview));
    },
    onEnd: (canceled: boolean) => {
      const { source, preview } = useDrag.getState();
      if (dragMotion.settle) clearTimeout(dragMotion.settle);
      if (source && !canceled) commit(source, preview);
      end();
    },
  };
}
