import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { usePlayer } from '@/audio/PlayerProvider';
import { formatDuration } from '@/lib/format';
import { clock, FADE_SECONDS, fitPeaks, moveHandle, nearestHandle, timeAt, type Handle, type TrimRange } from '@/lib/trim';
import { colors, radius, space } from '@/theme';

type Props = {
  uri: string;
  duration: number;
  peaks: number[];
  range: TrimRange;
  onChange: (range: TrimRange) => void;
  min: number;
  max: number;
};
type Live = Omit<Props, 'uri' | 'peaks'> & { width: number };

const TRACK_H = 76;
const HANDLE_W = 30;

/** 손잡이·구간 끌기 (제스처 콜백은 ref로 최신 값을 읽음) */
function useDragGesture(mode: Handle, live: RefObject<Live>) {
  const from = useRef<TrimRange | null>(null);
  return usePanGesture({
    runOnJS: true,
    activeOffsetX: [-4, 4],
    failOffsetY: [-14, 14],
    onActivate: () => { from.current = live.current.range; },
    onUpdate: (e) => {
      const base = from.current;
      const { width, duration, min, max, onChange } = live.current;
      if (!base || width <= 0) return;
      const delta = (e.translationX / width) * duration;
      onChange(moveHandle(base, mode, (mode === 'end' ? base.end : base.start) + delta, { duration, min, max }));
    },
    onFinalize: () => { from.current = null; },
  });
}

/**
 * 업로드 "구간 고르기": 파형 위 손잡이 두 개(시작·끝)를 끌거나, 가운데를 끌어 구간째 옮김. 빈 곳을 누르면 가까운 손잡이가 그리로.
 * ±1초 버튼, ▶ 고른 부분 듣기 · 끝 5초 듣기. 계산은 lib/trim.ts (웹 lib/trim.js와 같은 규칙)
 */
export function Trimmer({ uri, duration, peaks, range, onChange, min, max }: Props) {
  const [width, setWidth] = useState(0);
  const live = useRef<Live>({ range, onChange, duration, min, max, width });
  useEffect(() => { live.current = { range, onChange, duration, min, max, width }; });

  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const main = usePlayer();
  const [active, setActive] = useState(false);
  const playing = active && status.playing;
  // 고른 끝에 닿으면 멈춤
  useEffect(() => {
    if (playing && status.currentTime >= range.end) player.pause();
  }, [playing, status.currentTime, range.end, player]);
  // 다른 화면으로 가면 멈춤
  useFocusEffect(useCallback(() => () => player.pause(), [player]));

  const play = (from: number) => {
    main.pause();
    setActive(true);
    void player.seekTo(from).then(() => player.play());
  };
  const stop = () => {
    player.pause();
    setActive(false);
  };

  const startPan = useDragGesture('start', live);
  const endPan = useDragGesture('end', live);
  const movePan = useDragGesture('move', live);
  const tap = useTapGesture({
    runOnJS: true,
    onActivate: (e) => {
      const r = live.current.range;
      const t = timeAt(e.x, live.current.width, duration);
      onChange(moveHandle(r, nearestHandle(r, t), t, { duration, min, max }));
    },
  });

  const rules = { duration, min, max };
  const step = (which: 'start' | 'end', seconds: number) => onChange(moveHandle(range, which, range[which] + seconds, rules));
  const onA11y = (which: 'start' | 'end') => (e: AccessibilityActionEvent) =>
    step(which, e.nativeEvent.actionName === 'increment' ? 1 : -1);

  const bars = fitPeaks(peaks, Math.max(30, Math.min(peaks.length, Math.floor(width / 4))));
  const x = (t: number) => (t / duration) * width;
  const barW = bars.length ? Math.max(1.5, (width / bars.length) * 0.62) : 2;

  return (
    <View style={styles.box} testID="trimmer">
      <View style={styles.header}>
        <Text style={styles.title}>구간 고르기</Text>
        <Text style={styles.meta}>
          고른 길이 <Text style={styles.length} testID="trim-length">{formatDuration(range.end - range.start)}</Text> · 전체 {formatDuration(duration)}
        </Text>
      </View>

      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <GestureDetector gesture={tap}>
          <View style={styles.bars} collapsable={false} testID="trim-track">
            {bars.map((p, i) => {
              const t = ((i + 0.5) / bars.length) * duration;
              const on = t >= range.start && t <= range.end;
              return <View key={i} style={{ width: barW, height: Math.max(3, p * (TRACK_H - 14)), borderRadius: 1, backgroundColor: on ? colors.primary : colors.borderStrong }} />;
            })}
          </View>
        </GestureDetector>
        {width > 0 && (
          <>
            <View pointerEvents="none" style={[styles.dim, { left: 0, width: x(range.start) }]} />
            <View pointerEvents="none" style={[styles.dim, { left: x(range.end), right: 0 }]} />
            <GestureDetector gesture={movePan}>
              <View collapsable={false} style={[styles.region, { left: x(range.start), width: x(range.end) - x(range.start) }]} testID="trim-region" />
            </GestureDetector>
            {(['start', 'end'] as const).map((which) => (
              <GestureDetector key={which} gesture={which === 'start' ? startPan : endPan}>
                <View collapsable={false} style={[styles.handle, { left: x(range[which]) - HANDLE_W / 2 }]}
                  accessible accessibilityRole="adjustable" accessibilityLabel={which === 'start' ? '구간 시작' : '구간 끝'}
                  accessibilityValue={{ text: clock(range[which]) }}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={onA11y(which)}
                  testID={`trim-handle-${which}`}>
                  <View style={styles.handleLine} />
                  <View style={styles.grip} />
                </View>
              </GestureDetector>
            ))}
            {playing && <View pointerEvents="none" style={[styles.head, { left: x(Math.min(status.currentTime, duration)) }]} />}
          </>
        )}
      </View>

      <View style={styles.nudges}>
        <Nudge label="시작" value={range.start} onStep={(s) => step('start', s)} testID="trim-start" />
        <Nudge label="끝" value={range.end} onStep={(s) => step('end', s)} testID="trim-end" />
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={playing ? stop : () => play(range.start)} style={[styles.action, styles.actionLine]} testID="trim-play">
          <Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} />
          <Text style={styles.actionText}>{playing ? '멈춤' : '고른 부분 듣기'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => play(Math.max(range.start, range.end - 5))} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.muted }]}>끝 5초 듣기</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>손잡이를 끌어 시작과 끝을 고르고, 가운데를 끌면 구간째 옮겨져요. 잘린 앞뒤 {FADE_SECONDS}초는 부드럽게 커지고 작아져요.</Text>
    </View>
  );
}

function Nudge({ label, value, onStep, testID }: { label: string; value: number; onStep: (s: number) => void; testID: string }) {
  return (
    <View style={styles.nudge}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 1초 앞으로`} onPress={() => onStep(-1)} style={styles.nudgeBtn} hitSlop={4}>
        <Text style={styles.nudgeText}>−1초</Text>
      </Pressable>
      <Text style={styles.nudgeValue} testID={testID}>{label} <Text style={{ color: colors.text, fontWeight: '800' }}>{clock(value)}</Text></Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 1초 뒤로`} onPress={() => onStep(1)} style={styles.nudgeBtn} hitSlop={4}>
        <Text style={styles.nudgeText}>+1초</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.cardActive, borderRadius: radius.md, padding: space.md, gap: space.sm, marginTop: space.sm },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
  length: { color: colors.primaryText, fontWeight: '800' },
  track: { height: TRACK_H, marginHorizontal: HANDLE_W / 2 - 4, borderRadius: radius.sm, backgroundColor: colors.plate },
  bars: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  dim: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(10,10,15,0.55)' },
  region: { position: 'absolute', top: 0, bottom: 0, borderTopWidth: 2, borderBottomWidth: 2, borderColor: colors.primary },
  handle: { position: 'absolute', top: -4, bottom: -4, width: HANDLE_W, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  handleLine: { position: 'absolute', top: 0, bottom: 0, width: 4, borderRadius: 2, backgroundColor: colors.primary },
  grip: { width: 16, height: 36, borderRadius: 6, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.primary },
  head: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.white, zIndex: 3 },
  nudges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: space.sm, marginTop: space.xs },
  nudge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nudgeBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong },
  nudgeText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  nudgeValue: { color: colors.muted, fontSize: 12, minWidth: 78, textAlign: 'center', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
  actionLine: { borderWidth: 1, borderColor: colors.borderStrong },
  actionText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  hint: { color: colors.faint, fontSize: 11, lineHeight: 16 },
});
