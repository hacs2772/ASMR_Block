import { useCallback, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector, ScrollView, useCompetingGestures, usePanGesture, useTapGesture,
} from 'react-native-gesture-handler';
import { formatDuration } from '@/lib/format';
import {
  brickWidth, cycleLength, mainLayout, mixEnd, PX_PER_MINUTE, PX_PER_SECOND, SNAP_SECONDS, useEditor,
  type EditorBlock, type RowKey,
} from '@/store/editor';
import { categoryFallbackColor, colors, radius, space } from '@/theme';
import { Brick, BRICK_HEIGHT, DropSlot, MIX_BRICK_HEIGHT } from './Brick';
import {
  board, BOARD_PAD, LANE_HEIGHT, LANE_LABEL_HEIGHT, LANE_TOP, MAIN_TOP, RULER_HEIGHT, useBoardScroll, useDrag,
  useDragHandlers,
} from './drag';
import { useCategoryIcon } from './useCategoryIcon';

const LONG_PRESS_MS = 260;

/** 첫째 줄 블록들을 왼쪽부터 이어 붙인 위치(px) */
function placeSlots<T extends { block: EditorBlock }>(list: T[]) {
  let x = 0;
  return list.map((s) => {
    const placed = { ...s, x, width: brickWidth(s.block.duration) };
    x += placed.width;
    return placed;
  });
}
const GHOST_SLOT = 46;

/**
 * 레고 바닥판: 시간 눈금 + 첫째 줄(빈틈없이 이어짐) + (선택) 둘째 줄(원하는 시간에) + 전체 보기 슬라이더.
 * 블록 길이 = 소리 길이 (1분 = 18px)
 */
export function Board() {
  const main = useEditor((s) => s.main);
  const mix = useEditor((s) => s.mix);
  const mixTarget = useEditor((s) => s.mixTarget);
  const setMixTarget = useEditor((s) => s.setMixTarget);
  const showMix = useEditor((s) => s.showMix);
  const source = useDrag((s) => s.source);
  const preview = useDrag((s) => s.preview);
  const iconOf = useCategoryIcon();
  const viewportRef = useRef<ComponentRef<typeof View>>(null);
  const scrollRef = useRef<{ scrollTo: (o: { x: number; animated?: boolean }) => void; scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  const measure = useCallback(() => {
    viewportRef.current?.measureInWindow((x, y, width) => {
      board.viewport = { x, y, width };
      useBoardScroll.setState({ width });
    });
  }, []);

  useEffect(() => {
    board.measure = measure;
    board.scrollTo = (x: number) => scrollRef.current?.scrollTo({ x, animated: false });
    board.scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });
  }, [measure]);

  // 첫째 줄: 끌고 있으면 놓일 자리를 비워서 보여줌 (끄는 블록은 점선 자리로)
  const slots = useMemo(() => {
    type Slot = { key: string; block: EditorBlock; hole: boolean; owned: boolean };
    let list: Slot[] = main.items.map((i) => ({ key: i.key, block: i.block, hole: false, owned: i.block.owned }));
    if (source?.kind === 'main') {
      const dragged = list.find((s) => s.key === source.key);
      const others = list.filter((s) => s.key !== source.key);
      const at = preview?.row === 'main' ? preview.index : main.items.findIndex((i) => i.key === source.key);
      if (dragged) others.splice(Math.min(Math.max(at, 0), others.length), 0, { ...dragged, hole: true });
      list = others;
    } else if (source?.kind === 'new' && preview?.row === 'main') {
      list = [...list];
      list.splice(preview.index, 0, { key: '__new', block: source.block, hole: true, owned: true });
    }
    return placeSlots(list);
  }, [main.items, source, preview]);

  const slotByKey = new Map(slots.map((s, index) => [s.key, { ...s, index }]));
  const newSlot = slotByKey.get('__new');
  const rowWidth = slots.reduce((w, s) => w + s.width, 0);
  const previewEnd = preview?.row === 'mix' && source ? preview.start + source.block.duration : 0;
  const mixWidth = mix.enabled ? Math.max(mixEnd(mix.items), previewEnd, cycleLength({ main, mix })) * PX_PER_SECOND + 160 : 0;
  const contentWidth = BOARD_PAD * 2 + Math.max(rowWidth + 12 + GHOST_SLOT, mixWidth, 300);
  const contentHeight = mix.enabled ? LANE_TOP + LANE_HEIGHT + 10 : MAIN_TOP + BRICK_HEIGHT + 12;
  const ticks = Array.from({ length: Math.floor((contentWidth - BOARD_PAD * 2) / (PX_PER_MINUTE * 5)) + 1 }, (_, i) => i * 5);

  const onLaneTap = (locationX: number) => {
    const seconds = Math.max(0, Math.round(locationX / PX_PER_SECOND / SNAP_SECONDS) * SNAP_SECONDS);
    setMixTarget(mixTarget === seconds ? null : seconds);
  };

  return (
    <View style={styles.plate}>
      <View style={styles.header}>
        <Text style={styles.caption}>왼쪽부터 차례로 재생 · 1칸 = 1분</Text>
        {!mix.enabled && (
          <Pressable accessibilityRole="button" accessibilityLabel="둘째 줄 추가 (소리 겹치기)" onPress={showMix}
            hitSlop={8} style={styles.addRow} testID="add-row">
            <Text style={styles.addRowText}>＋ 줄</Text>
          </Pressable>
        )}
      </View>

      <View ref={viewportRef} collapsable={false} onLayout={measure}>
        {/* 둘째 줄 이름 (스크롤해도 제자리, 시간 말풍선보다 뒤에) */}
        {mix.enabled && (
          <Text style={styles.laneLabel} pointerEvents="none">② 둘째 줄 · 원하는 시간에 끌어다 놓기</Text>
        )}
        <ScrollView
          ref={scrollRef as never}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!source}
          scrollEventThrottle={16}
          onScroll={(e) => {
            board.scrollX = e.nativeEvent.contentOffset.x;
            useBoardScroll.setState({ x: board.scrollX });
          }}
          testID="board-scroll"
        >
          <View style={{ width: contentWidth, height: contentHeight }}>
            {/* 시간 눈금 (5분마다) */}
            {ticks.map((m) => (
              <View key={m} style={[styles.tick, { left: BOARD_PAD + m * PX_PER_MINUTE }]} pointerEvents="none">
                <Text style={styles.tickText}>{formatDuration(m * 60)}</Text>
              </View>
            ))}

            {/* 첫째 줄: 그리는 순서는 그대로 두고 위치만 바꿈 (끄는 중에 요소 순서가 바뀌면 끌기가 끊김) */}
            {main.items.map((item) => {
              const slot = slotByKey.get(item.key);
              if (!slot) return null;
              return (
                <DraggableBrick key={item.key} row="main" itemKey={item.key} block={item.block} hole={slot.hole} z={slot.index}
                  left={BOARD_PAD + slot.x} top={MAIN_TOP} width={slot.width} height={BRICK_HEIGHT} icon={iconOf(item.block.category)} />
              );
            })}
            {newSlot && <DropSlot width={newSlot.width} style={[styles.abs, { left: BOARD_PAD + newSlot.x, top: MAIN_TOP }]} />}
            {/* 다음 블록이 붙을 자리 (블록 상자에서 누르거나 끌어오기) */}
            <View pointerEvents="none" style={[styles.ghost, { left: BOARD_PAD + rowWidth + 12, top: MAIN_TOP }]}>
              <Text style={styles.ghostPlus}>+</Text>
            </View>

            {/* 둘째 줄 (따로 흐름, 원하는 시간에) */}
            {mix.enabled && (
              <>
                <View style={[styles.lane, { left: BOARD_PAD, top: LANE_TOP - 2, width: contentWidth - BOARD_PAD * 2 }]} testID="lane">
                  <Pressable accessibilityRole="button" accessibilityLabel="이 시간에 소리 넣기"
                    style={StyleSheet.absoluteFill} onPress={(e) => onLaneTap(e.nativeEvent.locationX)} testID="lane-bg" />
                  {mix.items.map((m) => (
                    <DraggableBrick key={m.key} row="mix" itemKey={m.key} block={m.block} z={0}
                      hole={source?.kind === 'mix' && source.key === m.key}
                      left={m.start * PX_PER_SECOND} top={2} width={brickWidth(m.block.duration)} height={MIX_BRICK_HEIGHT}
                      icon={iconOf(m.block.category)} timeLabel={`${formatDuration(m.start)} ~ ${formatDuration(m.start + m.block.duration)}`} />
                  ))}
                  {preview?.row === 'mix' && source && (
                    <View pointerEvents="none" style={[styles.dropOutline, { left: preview.start * PX_PER_SECOND, width: brickWidth(source.block.duration) }]}>
                      <Bubble text={`${formatDuration(preview.start)}부터`} />
                    </View>
                  )}
                  {mixTarget !== null && !source && (
                    <View pointerEvents="none" style={[styles.mark, { left: mixTarget * PX_PER_SECOND }]}>
                      <Bubble text={`${formatDuration(mixTarget)}에 넣기`} />
                    </View>
                  )}
                </View>
              </>
            )}

            {/* 둘째 줄에 놓을 때 세로 안내선 */}
            {preview?.row === 'mix' && (
              <View pointerEvents="none" style={[styles.guide, { left: BOARD_PAD + preview.start * PX_PER_SECOND }]} />
            )}
          </View>
        </ScrollView>
      </View>
      <Minimap />
    </View>
  );
}

/** 바닥판 위 블록: 누르면 선택, 꾹 눌러서 끌면 옮기기 */
function DraggableBrick({ row, itemKey, block, hole, z, left, top, width, height, icon, timeLabel }: {
  row: RowKey; itemKey: string; block: EditorBlock; hole: boolean; z: number; left: number; top: number; width: number; height: number;
  icon: ReturnType<ReturnType<typeof useCategoryIcon>>; timeLabel?: string;
}) {
  const selected = useEditor((s) => s.selected?.key === itemKey);
  const select = useEditor((s) => s.select);
  const handlers = useDragHandlers();

  const tap = useTapGesture({
    runOnJS: true,
    onActivate: () => select(selected ? null : { row, key: itemKey }),
  });
  const pan = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: (e) => handlers.onStart({ kind: row, key: itemKey, block }, e.absoluteX, e.absoluteY, e.x, e.y, width, height),
    onUpdate: (e) => handlers.onMove(e.absoluteX, e.absoluteY),
    onDeactivate: (e) => handlers.onEnd(e.canceled),
    onFinalize: () => { if (useDrag.getState().source) handlers.onEnd(true); },
  });
  const gesture = useCompetingGestures(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        style={[styles.abs, { left, top, width, height, zIndex: selected ? 500 : z }]}
        accessibilityRole="button"
        accessibilityLabel={`${row === 'main' ? '첫째 줄' : '둘째 줄'} ${block.title}${block.owned ? '' : ' (내 블록함에 없음)'}`}
        testID={`brick-${row}-${block.id}`}
      >
        <Brick color={block.category?.color ?? categoryFallbackColor} width={width} height={height} icon={icon}
          title={block.title} selected={selected} hole={hole} dimmed={!block.owned} />
        {selected && timeLabel && <Bubble text={timeLabel} />}
      </View>
    </GestureDetector>
  );
}

/** 시간 말풍선 (블록이 좁아도 한 줄로) */
function Bubble({ text }: { text: string }) {
  return (
    <View pointerEvents="none" style={styles.bubbleBox}>
      <Text style={styles.bubble} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** 전체 보기 슬라이더: 한 바퀴 전체를 색 띠로, 흰 테두리 = 지금 보이는 부분. 밀거나 누르면 그쪽으로 */
function Minimap() {
  const main = useEditor((s) => s.main);
  const mix = useEditor((s) => s.mix);
  const scroll = useBoardScroll();
  const widthRef = useRef(0);
  const total = Math.max(1, cycleLength({ main, mix }));
  const pct = (seconds: number) => `${(seconds / total) * 100}%` as const;

  const seek = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / Math.max(1, widthRef.current)));
    board.scrollTo(Math.max(0, ratio * total * PX_PER_SECOND - (board.viewport.width - BOARD_PAD * 2) / 2));
  };
  const pan = usePanGesture({ runOnJS: true, minDistance: 0, onBegin: (e) => seek(e.x), onUpdate: (e) => seek(e.x) });

  const visible = (scroll.width - BOARD_PAD * 2) / PX_PER_SECOND;
  const winWidth = Math.min(100, (visible / total) * 100);
  const winLeft = Math.max(0, Math.min(100 - winWidth, (scroll.x / PX_PER_SECOND / total) * 100));
  const mainSegments = mainLayout(main.items).map((l, i) => ({
    ...l, color: main.items[i].block.category?.color ?? categoryFallbackColor,
  }));

  return (
    <View style={styles.miniWrap}>
      <GestureDetector gesture={pan}>
        <View style={styles.mini} collapsable={false} onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
          accessibilityRole="adjustable" accessibilityLabel="전체 보기 슬라이더" testID="minimap">
          <View style={styles.miniRow}>
            {mainSegments.map((s) => (
              <View key={s.key} style={[styles.miniSeg, { left: pct(s.start), width: pct(s.length), backgroundColor: s.color }]} />
            ))}
          </View>
          {mix.enabled && (
            <View style={[styles.miniRow, { flex: 0.6 }]}>
              {mix.items.map((m) => (
                <View key={m.key} style={[styles.miniSeg, { left: pct(m.start), width: pct(m.block.duration), backgroundColor: m.block.category?.color ?? categoryFallbackColor }]} />
              ))}
            </View>
          )}
          <View pointerEvents="none" style={[styles.miniWin, { left: `${winLeft}%`, width: `${winWidth}%` }]} />
        </View>
      </GestureDetector>
      <View style={styles.miniEnds}>
        <Text style={styles.miniText}>0:00</Text>
        <Text style={styles.miniText}>밀어서 처음 ↔ 끝 보기</Text>
        <Text style={styles.miniText}>{formatDuration(cycleLength({ main, mix }))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { backgroundColor: '#11111D', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, paddingTop: space.sm },
  caption: { color: colors.faint, fontSize: 11 },
  addRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1 },
  addRowText: { color: colors.faint, fontSize: 11, fontWeight: '600' },
  abs: { position: 'absolute' },
  tick: { position: 'absolute', top: 0, height: RULER_HEIGHT, borderLeftWidth: 1, borderLeftColor: '#2A2A40', paddingLeft: 3 },
  tickText: { color: colors.faint, fontSize: 10, fontVariant: ['tabular-nums'] },
  ghost: {
    position: 'absolute', width: GHOST_SLOT, height: BRICK_HEIGHT, borderRadius: 9, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#3A3A55', alignItems: 'center', justifyContent: 'center',
  },
  ghostPlus: { color: '#C7C8FF', fontSize: 22, fontWeight: '700' },
  laneLabel: { position: 'absolute', left: space.md, top: LANE_TOP - LANE_LABEL_HEIGHT - 2, color: colors.muted, fontSize: 11 },
  lane: {
    position: 'absolute', height: LANE_HEIGHT, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2A2A40',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dropOutline: {
    position: 'absolute', top: 2, height: MIX_BRICK_HEIGHT, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#C7C8FF', backgroundColor: 'rgba(99,102,241,0.2)',
  },
  mark: { position: 'absolute', top: 0, width: 3, height: LANE_HEIGHT, marginLeft: -1, borderRadius: 2, backgroundColor: '#C7C8FF' },
  bubbleBox: { position: 'absolute', bottom: '100%', left: -2, width: 160, marginBottom: 4, flexDirection: 'row' },
  bubble: {
    backgroundColor: colors.primary, color: '#fff', fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 6, overflow: 'hidden', fontVariant: ['tabular-nums'],
  },
  guide: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: '#C7C8FF', opacity: 0.8 },
  miniWrap: { paddingHorizontal: space.md, paddingBottom: space.sm, gap: 4 },
  mini: {
    height: 22, borderRadius: 7, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
    padding: 3, gap: 2,
  },
  miniRow: { flex: 1 },
  miniSeg: { position: 'absolute', top: 0, bottom: 0, borderRadius: 2, borderRightWidth: 1, borderRightColor: colors.bg },
  miniWin: { position: 'absolute', top: -3, bottom: -3, borderWidth: 2, borderColor: colors.text, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.08)' },
  miniEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  miniText: { color: colors.faint, fontSize: 10, fontVariant: ['tabular-nums'] },
});
