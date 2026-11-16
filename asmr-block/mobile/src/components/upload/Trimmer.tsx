import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import { usePlayer } from '@/audio/PlayerProvider';
import { seekVideo } from '@/audio/playerControls';
import { formatDuration } from '@/lib/format';
import { clock, FADE_SECONDS, fitPeaks, moveHandle, nearestHandle, timeAt, type Handle, type TrimRange } from '@/lib/trim';
import { colors, radius, space } from '@/theme';
import { Trans, useTranslation } from 'react-i18next';

type Props = {
  uri: string;
  duration: number;
  peaks: number[];
  range: TrimRange;
  onChange: (range: TrimRange) => void;
  min: number;
  max: number;
  /** 영상이면 위에 화면을 보여 줌 (소리와 같은 구간으로 같이 잘림) */
  video?: boolean;
};
type Live = Omit<Props, 'uri' | 'peaks' | 'video'> & { width: number };

/** 영상 화면: 소리 없이, 재생 중엔 소리 위치를 따라가고 멈춰 있으면 손잡이를 옮긴 곳의 장면 */
function TrimVideo({ uri, time, playing }: { uri: string; time: number; playing: boolean }) {
  const player = useVideoPlayer(uri, (v) => {
    v.muted = true;
    v.loop = false;
  });
  useEffect(() => {
    if (playing) {
      if (Math.abs(player.currentTime - time) > 0.4) seekVideo(player, time);
      player.play();
    } else {
      player.pause();
      seekVideo(player, time);
    }
  }, [player, time, playing]);
  return <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />;
}

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
export function Trimmer({ uri, duration, peaks, range, onChange: setRange, min, max, video = false }: Props) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  // 영상: 손잡이를 옮긴 곳의 장면을 보여 줌
  const [scrub, setScrub] = useState(range.start);
  const live = useRef<Live>({ range, onChange: setRange, duration, min, max, width });
  const onChange = useCallback((next: TrimRange) => {
    const prev = live.current.range;
    setScrub(next.end !== prev.end && next.start === prev.start ? next.end : next.start);
    setRange(next);
  }, [setRange]);
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
      const sec = timeAt(e.x, live.current.width, duration);
      onChange(moveHandle(r, nearestHandle(r, sec), sec, { duration, min, max }));
    },
  });

  const rules = { duration, min, max };
  const step = (which: 'start' | 'end', seconds: number) => onChange(moveHandle(range, which, range[which] + seconds, rules));
  const onA11y = (which: 'start' | 'end') => (e: AccessibilityActionEvent) =>
    step(which, e.nativeEvent.actionName === 'increment' ? 1 : -1);

  const bars = fitPeaks(peaks, Math.max(30, Math.min(peaks.length, Math.floor(width / 4))));
  const x = (sec: number) => (sec / duration) * width;
  const barW = bars.length ? Math.max(1.5, (width / bars.length) * 0.62) : 2;

  return (
    <View style={styles.box} testID="trimmer">
      <View style={styles.header}>
        <Text style={styles.title}>{t('trim.title')}</Text>
        <Text style={styles.meta}>
          <Trans i18nKey="trim.picked" values={{ picked: formatDuration(Math.round(range.end - range.start)), total: formatDuration(Math.round(duration)) }}
            components={{ len: <Text style={styles.length} testID="trim-length" /> }} />
        </Text>
      </View>

      {video && <TrimVideo uri={uri} time={playing ? status.currentTime : scrub} playing={playing} />}
      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <GestureDetector gesture={tap}>
          <View style={styles.bars} collapsable={false} testID="trim-track">
            {bars.map((p, i) => {
              const sec = ((i + 0.5) / bars.length) * duration;
              const on = sec >= range.start && sec <= range.end;
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
                  accessible accessibilityRole="adjustable" accessibilityLabel={which === 'start' ? t('trim.startHandle') : t('trim.endHandle')}
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
        <Nudge label={t('trim.start')} value={range.start} onStep={(s) => step('start', s)} testID="trim-start" />
        <Nudge label={t('trim.end')} value={range.end} onStep={(s) => step('end', s)} testID="trim-end" />
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={playing ? stop : () => play(range.start)} style={[styles.action, styles.actionLine]} testID="trim-play">
          <Ionicons name={playing ? 'pause' : 'play'} size={15} color={colors.text} />
          <Text style={styles.actionText}>{playing ? t('trim.pause') : t('trim.playPart')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => play(Math.max(range.start, range.end - 5))} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.muted }]}>{t('trim.playEnd')}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {t('trim.help')}{video ? ` ${t('trim.helpVideo')}` : ''} {t('trim.helpFade', { seconds: FADE_SECONDS })}
      </Text>
    </View>
  );
}

function Nudge({ label, value, onStep, testID }: { label: string; value: number; onStep: (s: number) => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.nudge}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('trim.back1', { label })} onPress={() => onStep(-1)} style={styles.nudgeBtn} hitSlop={4}>
        <Text style={styles.nudgeText}>{t('trim.minus1')}</Text>
      </Pressable>
      <Text style={styles.nudgeValue} testID={testID}>{label} <Text style={{ color: colors.text, fontWeight: '800' }}>{clock(value)}</Text></Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t('trim.fwd1', { label })} onPress={() => onStep(1)} style={styles.nudgeBtn} hitSlop={4}>
        <Text style={styles.nudgeText}>{t('trim.plus1')}</Text>
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
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.sm, backgroundColor: '#000' },
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
