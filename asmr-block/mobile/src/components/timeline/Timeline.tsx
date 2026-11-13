import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector, ScrollView, useCompetingGestures, usePanGesture, useTapGesture,
} from 'react-native-gesture-handler';
import { formatDuration } from '@/lib/format';
import {
  durationsOf, findFreeStart, insertIndexAt, lengthOf, mainLayout, MAX_TOTAL_SECONDS, snapTime, useEditor,
  ZOOM_LEVELS, type TimelineItem, type TrackKey,
} from '@/store/editor';
import { categoryFallbackColor, colors, radius, space } from '@/theme';
import { useDrag, type DragSource, type DropPreview } from './dragStore';
import { BRICK_HEIGHT, LegoBrick } from './LegoBrick';

const PAD = 12;              // 트랙 왼쪽 여백
const LANE_HEIGHT = 64;
const RULER_HEIGHT = 22;
const GUTTER = 52;
const HIT_SLOP_Y = 16;       // 트랙 위아래로 이만큼 벗어나도 놓을 수 있게
const LONG_PRESS_MS = 220;

/**
 * 블록 상자(팔레트)와 타임라인이 같이 쓰는 위치 계산.
 * 타임라인이 화면에 그려질 때 자기 위치를 여기에 기록해 둠.
 */
export const timelineGeometry = {
  viewport: { x: 0, y: 0, width: 0 },
  laneTop: { main: RULER_HEIGHT, mix: RULER_HEIGHT + LANE_HEIGHT },
  scrollX: 0,
  scrollTo: (_x: number) => {},
  measure: () => {},

  timeAt(absX: number) {
    const { pxPerSecond } = useEditor.getState();
    return (absX - this.viewport.x + this.scrollX - PAD) / pxPerSecond;
  },

  /** 손가락 위치 → 어느 트랙 어디에 놓일지 (없으면 null) */
  hitTest(source: DragSource, absX: number, absY: number, grabX: number): DropPreview {
    const state = useEditor.getState();
    const excludeKey = source.kind === 'item' ? source.key : undefined;
    const inLane = (track: TrackKey) => {
      const top = this.viewport.y + this.laneTop[track];
      return absY >= top - HIT_SLOP_Y && absY <= top + LANE_HEIGHT + HIT_SLOP_Y;
    };
    if (inLane('main')) {
      const others = state.main.items.filter((i) => i.key !== excludeKey);
      const index = insertIndexAt(others, this.timeAt(absX));
      const layout = mainLayout(others);
      const seconds = index < layout.length ? layout[index].start : layout.reduce((t, l) => t + l.length, 0);
      return { track: 'main', seconds, insertIndex: index };
    }
    if (inLane('mix')) {
      const length = source.block.duration * (source.kind === 'item' ? source.repeat : 1);
      const leftTime = this.timeAt(absX - grabX);
      const snapped = snapTime(leftTime, state.main.items, 12 / state.pxPerSecond);
      return { track: 'mix', seconds: findFreeStart(state.mix.items, length, snapped, excludeKey) };
    }
    return null;
  },

  /** 놓기: 블록 상자에서 왔으면 추가, 타임라인 블록이면 이동 */
  commit(source: DragSource, preview: DropPreview) {
    if (!preview) return;
    const editor = useEditor.getState();
    if (source.kind === 'palette') {
      if (preview.track === 'main') editor.addToMain(source.block, preview.insertIndex);
      else editor.addToMix(source.block, preview.seconds);
    } else if (preview.track === 'main') {
      editor.moveToMain(source.key, preview.insertIndex ?? editor.main.items.length);
    } else {
      editor.moveToMix(source.key, preview.seconds);
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },

  /** 가장자리 근처로 끌면 자동으로 옆으로 스크롤 */
  autoScroll(absX: number) {
    const edge = 40;
    if (absX > this.viewport.x + this.viewport.width - edge) this.scrollTo(this.scrollX + 24);
    else if (absX < this.viewport.x + edge && this.scrollX > 0) this.scrollTo(Math.max(0, this.scrollX - 24));
  },
};

/** 드래그 시작/이동/놓기 공통 처리 (블록 상자에서도 사용) */
export function useDragHandlers() {
  const start = useDrag((s) => s.start);
  const move = useDrag((s) => s.move);
  const end = useDrag((s) => s.end);

  return {
    onStart: (source: DragSource, absX: number, absY: number, grabX: number, grabY: number, width: number) => {
      timelineGeometry.measure();
      start(source, absX, absY, grabX, grabY, width);
      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
    },
    onMove: (absX: number, absY: number) => {
      const { source, grabX } = useDrag.getState();
      if (!source) return;
      timelineGeometry.autoScroll(absX);
      move(absX, absY, timelineGeometry.hitTest(source, absX, absY, grabX));
    },
    onEnd: (canceled: boolean) => {
      const { source, preview } = useDrag.getState();
      if (source && !canceled) timelineGeometry.commit(source, preview);
      end();
    },
  };
}

/** 시간 눈금 간격: 확대 단계에 맞춰 눈금 사이가 70px 이상 */
function rulerStep(pxPerSecond: number) {
  const steps = [30, 60, 120, 300, 600, 900, 1800, 3600];
  return steps.find((s) => s * pxPerSecond >= 70) ?? 7200;
}

export function Timeline() {
  const { main, mix, pxPerSecond, setZoom, setVolume, enableMix, removeMix } = useEditor();
  const d = durationsOf({ main, mix });
  const scrollRef = useRef<{ scrollTo: (o: { x: number; animated?: boolean }) => void } | null>(null);
  const viewportRef = useRef<ComponentRef<typeof View>>(null);
  const dragActive = useDrag((s) => s.source !== null);

  const measure = useCallback(() => {
    viewportRef.current?.measureInWindow((x, y, width) => {
      timelineGeometry.viewport = { x, y, width };
    });
  }, []);

  useEffect(() => {
    timelineGeometry.measure = measure;
    timelineGeometry.scrollTo = (x: number) => scrollRef.current?.scrollTo({ x, animated: false });
  }, [measure]);

  const contentWidth = PAD + Math.max(d.total, 600) * pxPerSecond + 240;
  const step = rulerStep(pxPerSecond);
  const ticks = Array.from({ length: Math.floor((contentWidth - PAD) / pxPerSecond / step) + 1 }, (_, i) => i * step);
  const zoomIndex = ZOOM_LEVELS.indexOf(pxPerSecond);

  const onLaneLayout = (track: TrackKey) => (e: LayoutChangeEvent) => {
    timelineGeometry.laneTop[track] = e.nativeEvent.layout.y;
  };

  return (
    <View style={styles.card}>
      <View style={styles.toolbar}>
        <Text style={styles.total}>
          총 <Text style={styles.totalStrong}>{formatDuration(d.total)}</Text>
          {d.total > MAX_TOTAL_SECONDS && <Text style={{ color: colors.danger }}>  (최대 10시간)</Text>}
        </Text>
        <View style={styles.zoom}>
          <ZoomButton icon="remove" label="축소" disabled={zoomIndex <= 0} onPress={() => setZoom(ZOOM_LEVELS[zoomIndex - 1])} />
          <Text style={styles.zoomText}>{zoomLabel(pxPerSecond)}</Text>
          <ZoomButton icon="add" label="확대" disabled={zoomIndex >= ZOOM_LEVELS.length - 1} onPress={() => setZoom(ZOOM_LEVELS[zoomIndex + 1])} />
        </View>
      </View>

      <View style={styles.row}>
        {/* 트랙 이름 */}
        <View style={styles.gutter}>
          <View style={{ height: RULER_HEIGHT }} />
          <View style={styles.laneLabel}>
            <Text style={styles.laneName}>메인</Text>
            <Text style={styles.laneSub}>{formatDuration(d.main)}</Text>
          </View>
          <View style={styles.laneLabel}>
            {mix.enabled ? (
              <>
                <Text style={styles.laneName}>믹스</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="믹스 트랙 빼기" onPress={removeMix} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.faint} />
                </Pressable>
              </>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="믹스 트랙 추가" onPress={enableMix} style={styles.addMix} testID="enable-mix">
                <Ionicons name="add" size={14} color={colors.muted} />
                <Text style={styles.laneSub}>믹스</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 타임라인 (좌우 스크롤) */}
        <View ref={viewportRef} style={{ flex: 1 }} onLayout={measure} collapsable={false}>
          <ScrollView
            ref={scrollRef as never}
            horizontal
            showsHorizontalScrollIndicator
            scrollEnabled={!dragActive}
            scrollEventThrottle={16}
            onScroll={(e) => { timelineGeometry.scrollX = e.nativeEvent.contentOffset.x; }}
            testID="timeline-scroll"
          >
            <View style={{ width: contentWidth }}>
              <View style={styles.ruler}>
                {ticks.map((t) => (
                  <View key={t} style={[styles.tick, { left: PAD + t * pxPerSecond }]}>
                    <Text style={styles.tickText}>{formatDuration(t)}</Text>
                  </View>
                ))}
              </View>
              <Lane track="main" items={main.items} onLayout={onLaneLayout('main')} />
              <Lane track="mix" items={mix.items} enabled={mix.enabled} onLayout={onLaneLayout('mix')} />
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.volumes}>
        <VolumeSlider label="메인 볼륨" value={main.volume} onChange={(v) => setVolume('main', v)} />
        {mix.enabled && <VolumeSlider label="믹스 볼륨" value={mix.volume} onChange={(v) => setVolume('mix', v)} />}
      </View>
    </View>
  );
}

function zoomLabel(px: number) {
  // 화면 100px가 몇 분인지
  const minutes = 100 / px / 60;
  return minutes >= 60 ? `100px=${Math.round(minutes / 60)}시간` : `100px=${Math.round(minutes)}분`;
}

function ZoomButton({ icon, label, onPress, disabled }: { icon: 'add' | 'remove'; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
      style={[styles.zoomButton, disabled && { opacity: 0.35 }]} hitSlop={6}>
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.volumeRow}>
      <Text style={styles.volumeLabel}>{label}</Text>
      <Slider
        style={{ flex: 1, height: 28 }}
        minimumValue={0} maximumValue={1} step={0.05} value={value}
        onSlidingComplete={onChange}
        minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.border} thumbTintColor={colors.text}
        accessibilityLabel={label}
      />
      <Text style={styles.volumeValue}>{Math.round(value * 100)}</Text>
    </View>
  );
}

/** 트랙 한 줄 (레고 바닥판) */
function Lane({ track, items, enabled = true, onLayout }: {
  track: TrackKey; items: TimelineItem[]; enabled?: boolean; onLayout: (e: LayoutChangeEvent) => void;
}) {
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const preview = useDrag((s) => (s.preview?.track === track ? s.preview : null));
  const dragSource = useDrag((s) => s.source);
  const layout = track === 'main' ? mainLayout(items) : items.map((i) => ({ key: i.key, start: i.start ?? 0, length: lengthOf(i) }));
  const dragLength = dragSource ? dragSource.block.duration * (dragSource.kind === 'item' ? dragSource.repeat : 1) : 0;

  return (
    <View style={[styles.lane, track === 'mix' && styles.mixLane, !enabled && styles.laneDisabled]} onLayout={onLayout}
      testID={`lane-${track}`}>
      {!enabled && (
        <Text style={styles.laneHint}>여기로 끌어오면 믹스 트랙이 생겨요 · 원하는 부분에만 소리를 섞어요</Text>
      )}
      {enabled && items.length === 0 && (
        <Text style={styles.laneHint}>
          {track === 'main' ? '아래 블록 상자에서 누르거나, 꾹 눌러 끌어다 놓으세요' : '섞고 싶은 시간에 블록을 끌어다 놓으세요'}
        </Text>
      )}
      {items.map((item, i) => (
        <DraggableBrick key={item.key} item={item} track={track} left={PAD + layout[i].start * pxPerSecond}
          width={layout[i].length * pxPerSecond} />
      ))}
      {/* 놓일 자리 미리보기 */}
      {preview && track === 'main' && (
        <View style={[styles.insertBar, { left: PAD + preview.seconds * pxPerSecond - 2 }]} pointerEvents="none" />
      )}
      {preview && track === 'mix' && (
        <View pointerEvents="none"
          style={[styles.dropOutline, { left: PAD + preview.seconds * pxPerSecond, width: Math.max(8, dragLength * pxPerSecond) }]} />
      )}
    </View>
  );
}

/** 타임라인 위 블록: 누르면 선택, 꾹 눌러서 끌면 이동 */
function DraggableBrick({ item, track, left, width }: { item: TimelineItem; track: TrackKey; left: number; width: number }) {
  const selected = useEditor((s) => s.selected?.key === item.key);
  const select = useEditor((s) => s.select);
  const dragging = useDrag((s) => s.source?.kind === 'item' && s.source.key === item.key);
  const handlers = useDragHandlers();
  const color = item.block.category?.color ?? categoryFallbackColor;

  const tap = useTapGesture({
    runOnJS: true,
    onActivate: () => select(selected ? null : { track, key: item.key }),
  });
  const pan = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: LONG_PRESS_MS,
    onActivate: (e) => {
      select({ track, key: item.key });
      handlers.onStart({ kind: 'item', key: item.key, track, block: item.block, repeat: item.repeat },
        e.absoluteX, e.absoluteY, e.x, e.y, width);
    },
    onUpdate: (e) => handlers.onMove(e.absoluteX, e.absoluteY),
    onDeactivate: (e) => handlers.onEnd(e.canceled),
    onFinalize: () => { if (useDrag.getState().source) handlers.onEnd(true); },
  });
  const gesture = useCompetingGestures(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.brickSlot, { left, width: Math.max(3, width) }]} collapsable={false}
        accessibilityRole="button"
        accessibilityLabel={`${track === 'main' ? '메인' : '믹스'} ${item.block.title} ${item.repeat > 1 ? `${item.repeat}번 반복` : ''}`}
        testID={`brick-${track}-${item.block.id}`}>
        <LegoBrick color={color} width={width} title={item.block.title} repeat={item.repeat}
          seconds={lengthOf(item)} selected={selected} faded={dragging} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: space.sm, borderWidth: 1, borderColor: colors.border },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, marginBottom: 4 },
  total: { color: colors.muted, fontSize: 13 },
  totalStrong: { color: colors.text, fontWeight: '800' },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoomButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: colors.faint, fontSize: 11, minWidth: 74, textAlign: 'center' },
  row: { flexDirection: 'row' },
  gutter: { width: GUTTER, paddingLeft: space.sm },
  laneLabel: { height: LANE_HEIGHT, justifyContent: 'center', gap: 2 },
  laneName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  laneSub: { color: colors.faint, fontSize: 10 },
  addMix: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3, alignSelf: 'flex-start' },
  ruler: { height: RULER_HEIGHT },
  tick: { position: 'absolute', top: 0, bottom: 0, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 3 },
  tickText: { color: colors.faint, fontSize: 10 },
  lane: {
    height: LANE_HEIGHT, backgroundColor: '#0E2318', borderTopWidth: 1, borderTopColor: '#163826',
    justifyContent: 'center',
  },
  mixLane: { backgroundColor: '#101A2E', borderTopColor: '#1B2A47' },
  laneDisabled: { backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  laneHint: { color: colors.faint, fontSize: 11, paddingLeft: PAD },
  brickSlot: { position: 'absolute', top: (LANE_HEIGHT - BRICK_HEIGHT) / 2 - 3 },
  insertBar: { position: 'absolute', top: 4, bottom: 4, width: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  dropOutline: {
    position: 'absolute', top: (LANE_HEIGHT - BRICK_HEIGHT) / 2, height: BRICK_HEIGHT, borderRadius: 4,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  volumes: { paddingHorizontal: space.md, marginTop: space.sm, gap: 2 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  volumeLabel: { color: colors.muted, fontSize: 12, width: 62 },
  volumeValue: { color: colors.muted, fontSize: 11, width: 26, textAlign: 'right' },
});
