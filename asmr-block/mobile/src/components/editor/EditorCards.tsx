import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { cycleLength, LISTEN_OPTIONS, listenNote, useEditor } from '@/store/editor';
import { colors, radius, space } from '@/theme';

/** 둘째 줄 소리 크기(%) + 줄 빼기. 둘째 줄을 쓸 때만 보임 */
export function RowTwoCard() {
  const mix = useEditor((s) => s.mix);
  const setMixVolume = useEditor((s) => s.setMixVolume);
  const hideMix = useEditor((s) => s.hideMix);
  if (!mix.enabled) return null;
  return (
    <View style={styles.card} testID="row-two-card">
      <View style={styles.head}>
        <Text style={styles.title}>둘째 줄 소리 크기</Text>
        <Text style={styles.value} testID="mix-volume">{Math.round(mix.volume * 100)}%</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="둘째 줄 빼기" onPress={hideMix} hitSlop={8} style={styles.remove}>
          <Text style={styles.removeText}>줄 빼기</Text>
        </Pressable>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0} maximumValue={1} step={0.05} value={mix.volume}
        onValueChange={setMixVolume}
        minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.border} thumbTintColor={colors.text}
        accessibilityLabel="둘째 줄 소리 크기"
      />
    </View>
  );
}

/** 얼마나 들을까요? 한 바퀴를 그 시간 동안 이어서 반복 */
export function ListenCard() {
  const listenMinutes = useEditor((s) => s.listenMinutes);
  const setListenMinutes = useEditor((s) => s.setListenMinutes);
  const cycle = useEditor((s) => cycleLength(s));
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🌙 얼마나 들을까요?</Text>
      <View style={styles.chips}>
        {LISTEN_OPTIONS.map((o) => (
          <Chip key={o.minutes} label={o.label} active={listenMinutes === o.minutes} onPress={() => setListenMinutes(o.minutes)} />
        ))}
      </View>
      <Text style={styles.note}>{listenNote(cycle, listenMinutes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  value: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  remove: { marginLeft: 'auto' },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  slider: { height: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { color: colors.muted, fontSize: 12 },
});
