import React, { useEffect, useMemo, useState } from 'react';
import { IoPlay, IoStop } from 'react-icons/io5';
import { brickWidth, cycleLength, mixEnd, PX_PER_MINUTE, PX_PER_SECOND, SNAP_SECONDS, xAtTime } from '../../lib/editorLogic';
import { colorOf, formatDuration, iconOf } from '../../lib/blocks';
import useEditorStore from '../../store/editorStore';
import Brick from '../brand/Brick';
import { dragHandlers, geo, useDragStore } from './drag';
import { usePreviewClock } from './useMixPreview';

const PAD = 14;
const RULER = 22;
const MAIN_H = 56;
const MIX_H = 32;
const MAIN_TOP = RULER + 8;
const LANE_TOP = MAIN_TOP + MAIN_H + 34;

/** 첫째 줄 블록들을 왼쪽부터 이어 붙인 위치(px) */
function placeSlots(list) {
  let x = 0;
  return list.map((s) => {
    const placed = { ...s, x, width: brickWidth(s.block.duration) };
    x += placed.width;
    return placed;
  });
}

/**
 * 레고 바닥판: 시간 눈금 + 첫째 줄(빈틈없이) + 레이어드(원하는 시간에) + 재생선.
 * 끄는 동안 다른 블록은 미끄러져 자리를 비켜 줌 (left만 바뀌고 CSS가 스르륵)
 */
function Board({ playing, onTogglePlay }) {
  const main = useEditorStore((s) => s.main);
  const mix = useEditorStore((s) => s.mix);
  const mixTarget = useEditorStore((s) => s.mixTarget);
  const setMixTarget = useEditorStore((s) => s.setMixTarget);
  const showMix = useEditorStore((s) => s.showMix);
  const hideMix = useEditorStore((s) => s.hideMix);
  const drag = useDragStore((s) => s.drag);
  const source = drag?.source;
  const preview = drag?.preview;
  // 처음부터 있던 블록은 그대로, 나중에 들어오는 블록만 위에서 딸깍 내려앉음
  const [initialKeys] = useState(() => new Set([...main.items, ...mix.items].map((i) => i.key)));

  const slots = useMemo(() => {
    let list = main.items.map((i) => ({ key: i.key, block: i.block, hole: false }));
    if (source?.kind === 'main') {
      const dragged = list.find((s) => s.key === source.key);
      const others = list.filter((s) => s.key !== source.key);
      const at = preview?.row === 'main' ? preview.index : main.items.findIndex((i) => i.key === source.key);
      if (dragged) others.splice(Math.min(Math.max(at, 0), others.length), 0, { ...dragged, hole: true });
      list = others;
    } else if (source?.kind === 'new' && preview?.row === 'main') {
      list = [...list];
      list.splice(preview.index, 0, { key: '__new', block: source.block, hole: true });
    }
    return placeSlots(list);
  }, [main.items, source, preview]);
  const slotByKey = new Map(slots.map((s, index) => [s.key, { ...s, index }]));
  const newSlot = slotByKey.get('__new');
  const rowWidth = slots.reduce((w, s) => w + s.width, 0);
  const previewEnd = preview?.row === 'mix' && source ? preview.start + source.block.duration : 0;
  const total = cycleLength({ main, mix });
  const mixWidth = mix.enabled ? Math.max(mixEnd(mix.items), previewEnd, total) * PX_PER_SECOND + 200 : 0;
  const contentWidth = PAD * 2 + Math.max(rowWidth + 90, mixWidth, 600);
  const contentHeight = mix.enabled ? LANE_TOP + MIX_H + 22 : MAIN_TOP + MAIN_H + 20;
  const ticks = Array.from({ length: Math.floor((contentWidth - PAD * 2) / (PX_PER_MINUTE * 5)) + 1 }, (_, i) => i * 5);

  const onLaneClick = (e) => {
    if (e.target !== e.currentTarget) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const seconds = Math.max(0, Math.round(x / PX_PER_SECOND / SNAP_SECONDS) * SNAP_SECONDS);
    setMixTarget(mixTarget === seconds ? null : seconds);
  };

  return (
    <div className="card overflow-hidden bg-plate">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={onTogglePlay} disabled={main.items.length === 0}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-40 ${
            playing ? 'border-pink bg-pink text-white' : 'border-line-strong bg-pink-soft text-pink-text'}`} data-testid="play-all">
          {playing ? <IoStop /> : <IoPlay />} {playing ? '멈춤' : '전체 듣기'}
        </button>
        <span className="text-xs text-faint">1칸 = 1분 · 한 바퀴 {formatDuration(total)}</span>
        <button type="button" onClick={mix.enabled ? hideMix : showMix} className="ml-auto rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:text-ink" data-testid="toggle-mix">
          {mix.enabled ? '레이어드 숨기기' : '＋ 레이어드'}
        </button>
      </div>

      <div ref={(el) => { geo.scroller = el; }} className="overflow-x-auto" data-testid="board">
        <div className="relative" style={{ width: contentWidth, height: contentHeight }}>
          {ticks.map((m) => (
            <span key={m} className="absolute top-1 border-l border-line pl-1 text-[10px] text-faint" style={{ left: PAD + m * PX_PER_MINUTE, height: RULER - 4 }}>
              {formatDuration(m * 60)}
            </span>
          ))}

          {/* 첫째 줄 */}
          <div ref={(el) => { geo.mainRow = el; }} className="absolute" style={{ left: PAD, top: MAIN_TOP, height: MAIN_H, width: contentWidth - PAD * 2 }}>
            {main.items.map((item) => {
              const slot = slotByKey.get(item.key);
              if (!slot) return null;
              return (
                <BoardBrick key={item.key} row="main" item={item} left={slot.x} width={slot.width} height={MAIN_H}
                  hole={slot.hole} z={slot.index} enter={!initialKeys.has(item.key)} />
              );
            })}
            {newSlot && <span className="drop-slot slide" style={{ left: newSlot.x, top: 0, width: newSlot.width, height: MAIN_H }} />}
            <span className="slide absolute flex items-center justify-center rounded-md border-2 border-dashed border-line-strong text-2xl font-bold text-pink-text"
              style={{ left: rowWidth + 12, top: 0, width: 56, height: MAIN_H }} aria-hidden="true">+</span>
          </div>

          {/* 레이어드 */}
          {mix.enabled && (
            <>
              <p className="absolute text-[11px] text-muted" style={{ left: PAD, top: LANE_TOP - 22 }}>② 레이어드 · 빈 곳을 눌러 시간을 정하거나, 블록을 원하는 시간에 끌어다 놓기</p>
              <div ref={(el) => { geo.lane = el; }} onClick={onLaneClick} role="presentation" data-testid="lane"
                className="absolute cursor-pointer rounded-lg border border-dashed border-line bg-white/[0.02]"
                style={{ left: PAD, top: LANE_TOP - 4, height: MIX_H + 8, width: contentWidth - PAD * 2 }}>
                {mix.items.map((m) => (
                  <BoardBrick key={m.key} row="mix" item={m} left={m.start * PX_PER_SECOND} top={4} width={brickWidth(m.block.duration)} height={MIX_H}
                    hole={source?.kind === 'mix' && source.key === m.key} z={1} enter={!initialKeys.has(m.key)} />
                ))}
                {preview?.row === 'mix' && source && (
                  <span className="drop-slot" style={{ left: preview.start * PX_PER_SECOND, top: 4, width: brickWidth(source.block.duration), height: MIX_H }}>
                    <Bubble text={`${formatDuration(preview.start)}부터`} />
                  </span>
                )}
                {mixTarget !== null && !source && (
                  <span className="pointer-events-none absolute top-0 h-full w-[3px] rounded bg-pink-text" style={{ left: mixTarget * PX_PER_SECOND }}>
                    <Bubble text={`${formatDuration(mixTarget)}에 넣기`} />
                  </span>
                )}
              </div>
            </>
          )}
          <Playhead />
        </div>
      </div>
    </div>
  );
}

/** 바닥판 위 블록: 누르면 선택, 끌면 옮기기 (블록함으로 끌면 빼기) */
function BoardBrick({ row, item, left, top = 0, width, height, hole, z, enter }) {
  const selected = useEditorStore((s) => s.selected?.key === item.key);
  const select = useEditorStore((s) => s.select);
  const pop = useEditorStore((s) => (s.pop?.key === item.key ? s.pop.at : 0));
  const [popping, setPopping] = useState(false);
  useEffect(() => {
    if (!pop) return undefined;
    setPopping(true);
    const t = setTimeout(() => setPopping(false), 340);
    return () => clearTimeout(t);
  }, [pop]);

  const handlers = dragHandlers({
    source: () => ({ kind: row, key: item.key, block: item.block }),
    getSize: () => ({ width, height }),
    onClick: () => select(selected ? null : { row, key: item.key }),
  });
  const label = width >= 76 ? formatDuration(item.block.duration) : null;

  return (
    <div {...handlers} className={`slide absolute cursor-grab touch-pan-x select-none ${enter ? 'drop-in' : ''}`}
      style={{ left, top, zIndex: selected ? 50 : z }} title={item.block.title}
      role="button" aria-label={`${row === 'main' ? '첫째 줄' : '레이어드'} ${item.block.title}`} data-testid={`brick-${row}-${item.block.id}`}>
      <div className={popping ? 'brick-pop' : undefined} style={hole ? { opacity: 0.25, outline: '2px dashed #ff85af', outlineOffset: 1, borderRadius: 6 } : undefined}>
        <Brick color={colorOf(item.block.category)} width={width} height={height} icon={iconOf(item.block.category)} label={label}
          minutes={item.block.duration / 60} selected={selected} dim={!item.block.owned} />
      </div>
      {selected && row === 'mix' && <Bubble text={`${formatDuration(item.start)} ~ ${formatDuration(item.start + item.block.duration)}`} />}
    </div>
  );
}

function Bubble({ text }) {
  return <span className="pointer-events-none absolute bottom-full left-0 mb-1 whitespace-nowrap rounded-md bg-pink px-1.5 py-0.5 text-[11px] font-extrabold text-white">{text}</span>;
}

/** 전체 듣기 재생선 (이것만 다시 그려서 블록들은 그대로) */
function Playhead() {
  const t = usePreviewClock((s) => s.t);
  const items = useEditorStore((s) => s.main.items);
  if (t === null) return null;
  const x = PAD + xAtTime(items, t);
  return <span className="pointer-events-none absolute bottom-0 top-0 z-[60] w-[2px] bg-pink shadow-[0_0_10px_rgba(247,96,154,.8)]" style={{ left: x }} data-testid="playhead" />;
}

export const BOARD_SIZES = { MAIN_H, MIX_H };
export default Board;
