import { create } from 'zustand';
import { insertIndexAtX, PX_PER_SECOND, snapMixStart, tiltFor } from '../../lib/editorLogic';
import useEditorStore from '../../store/editorStore';

/**
 * 블록 끌어다 놓기 (마우스·터치 둘 다, pointer 이벤트).
 * - 마우스: 누르고 4px 움직이면 들기 시작 / 터치: 0.22초 꾹 누르면 들기 (그 전에 움직이면 화면 스크롤)
 * - 손가락 위치는 화면을 다시 그리지 않고 끄는 블록(DOM)만 직접 옮김 → 부드럽게 따라옴
 * - 놓일 자리(preview)는 바뀔 때만 상태를 바꿈
 * source: { kind: 'new' | 'main' | 'mix', key?, block }
 */
export const useDragStore = create(() => ({ drag: null }));

/** 바닥판·블록함 DOM (각 컴포넌트가 ref로 채움) */
export const geo = { scroller: null, mainRow: null, lane: null, shelf: null, ghost: null };
const pointer = { x: 0, y: 0, lastX: 0, settle: null };

const samePreview = (a, b) => a === b || (!!a && !!b && a.row === b.row && a.index === b.index && a.start === b.start);
const inside = (r, x, y, padY = 0) => r && x >= r.left && x <= r.right && y >= r.top - padY && y <= r.bottom + padY;

function hitTest(source, x, y, grabX, previous) {
  const state = useEditorStore.getState();
  const shelf = geo.shelf?.getBoundingClientRect();
  if (inside(shelf, x, y)) return source.kind === 'new' ? null : { row: 'box' };
  const view = geo.scroller?.getBoundingClientRect();
  const inView = view && x >= view.left - 30 && x <= view.right + 30;
  const lane = state.mix.enabled ? geo.lane?.getBoundingClientRect() : null;
  if (inView && lane && source.kind !== 'main' && y >= lane.top - 18 && y <= lane.bottom + 26) {
    const raw = (x - grabX - lane.left) / PX_PER_SECOND;
    const exclude = source.kind === 'mix' ? source.key : undefined;
    return { row: 'mix', start: snapMixStart(raw, source.block.duration, state.main.items, state.mix.items, exclude) };
  }
  const row = geo.mainRow?.getBoundingClientRect();
  if (inView && row && source.kind !== 'mix' && y >= row.top - 34 && y <= row.bottom + (lane ? 8 : 34)) {
    const exclude = source.kind === 'main' ? source.key : undefined;
    return { row: 'main', index: insertIndexAtX(state.main.items, x - row.left, exclude) };
  }
  // 잠깐 줄 밖으로 나가도 놓일 자리는 유지 (블록함에서 끌어온 건 취소)
  return source.kind === 'new' || previous?.row === 'box' ? null : previous;
}

function placeGhost(tilt = 0) {
  const d = useDragStore.getState().drag;
  if (!geo.ghost || !d) return;
  geo.ghost.style.transform = `translate(${pointer.x - d.grabX}px, ${pointer.y - d.grabY - 6}px) rotate(${tilt}deg) scale(1.08)`;
}

function autoScroll(x) {
  const s = geo.scroller;
  if (!s) return;
  const r = s.getBoundingClientRect();
  if (x > r.right - 48) s.scrollLeft += Math.ceil((x - (r.right - 48)) / 3);
  else if (x < r.left + 48) s.scrollLeft -= Math.ceil((r.left + 48 - x) / 3);
}

function commit(source, preview) {
  if (!preview) return;
  const e = useEditorStore.getState();
  if (preview.row === 'box') { if (source.kind !== 'new') e.remove(source.key); return; }
  if (source.kind === 'new') {
    if (preview.row === 'main') e.addMain(source.block, preview.index);
    else e.addMix(source.block, preview.start);
  } else if (source.kind === 'main' && preview.row === 'main') e.moveMain(source.key, preview.index);
  else if (source.kind === 'mix' && preview.row === 'mix') e.moveMix(source.key, preview.start);
}

/**
 * 끌 수 있는 요소에 붙이는 이벤트. onClick: 끌지 않고 눌렀을 때
 * getSize: () => ({ width, height }) 끄는 블록 크기
 */
export function dragHandlers({ source, getSize, onClick }) {
  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const touch = e.pointerType !== 'mouse';
      let started = false;
      let holdTimer = null;

      const begin = () => {
        if (started) return;
        started = true;
        const { width, height } = getSize();
        useEditorStore.getState().select(null);
        useDragStore.setState({ drag: { source: source(), grabX: Math.min(startX - rect.left, width - 4), grabY: startY - rect.top, width, height, preview: null } });
        pointer.lastX = pointer.x;
        requestAnimationFrame(() => placeGhost());
        if (navigator.vibrate && touch) navigator.vibrate(10);
      };
      const move = (ev) => {
        pointer.x = ev.clientX;
        pointer.y = ev.clientY;
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!started) {
          if (!touch && dist > 4) begin();
          else if (touch && dist > 8) cleanup(); // 꾹 누르기 전에 움직이면 스크롤로 봄
          if (!started) return;
        }
        const d = useDragStore.getState().drag;
        if (!d) return;
        placeGhost(tiltFor(ev.clientX - pointer.lastX));
        pointer.lastX = ev.clientX;
        clearTimeout(pointer.settle);
        pointer.settle = setTimeout(() => placeGhost(0), 90);
        autoScroll(ev.clientX);
        const preview = hitTest(d.source, ev.clientX, ev.clientY, d.grabX, d.preview);
        if (!samePreview(preview, d.preview)) useDragStore.setState({ drag: { ...d, preview } });
      };
      const blockScroll = (ev) => { if (started) ev.preventDefault(); };
      const up = (ev) => {
        const wasClick = !started && ev.type === 'pointerup' && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8;
        if (started && ev.type === 'pointerup') {
          const d = useDragStore.getState().drag;
          if (d) commit(d.source, d.preview);
        }
        cleanup();
        if (wasClick) onClick?.();
      };
      function cleanup() {
        clearTimeout(holdTimer);
        clearTimeout(pointer.settle);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        window.removeEventListener('touchmove', blockScroll);
        if (started) useDragStore.setState({ drag: null });
      }

      pointer.x = startX;
      pointer.y = startY;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      window.addEventListener('touchmove', blockScroll, { passive: false });
      if (touch) holdTimer = setTimeout(begin, 220);
    },
  };
}
