import Slider from '@react-native-community/slider';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LISTEN_OPTIONS, useEditor } from '@/store/editor';
import { colors, radius, space } from '@/theme';

/** 둘째 줄 소리 크기(%) + 줄 빼기. 바닥판 안에 한 줄로 (둘째 줄을 쓸 때만) */
export function RowTwoVolume() {
  const mix = useEditor((s) => s.mix);
  const setMixVolume = useEditor((s) => s.setMixVolume);
  const hideMix = useEditor((s) => s.hideMix);
  if (!mix.enabled) return null;
  return (
    <View style={styles.volRow} testID="row-two-volume">
      <Text style={styles.volLabel}>② 소리 크기</Text>
      <Slider
        style={styles.slider}
        minimumValue={0} maximumValue={1} step={0.05} value={mix.volume}
        onValueChange={setMixVolume}
        minimumTrackTintColor={colors.primary} maximumTrackTintColor={colors.border} thumbTintColor={colors.text}
        accessibilityLabel="둘째 줄 소리 크기"
      />
      <Text style={styles.volValue} testID="mix-volume">{Math.round(mix.volume * 100)}%</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="둘째 줄 빼기" onPress={hideMix} hitSlop={8}>
        <Text style={styles.removeText}>줄 빼기</Text>
      </Pressable>
    </View>
  );
}

/** 🌙 얼마나 들을까요? 한 줄짜리 작은 선택 (한 바퀴를 그 시간 동안 이어서 반복) */
export function ListenRow() {
  const listenMinutes = useEditor((s) => s.listenMinutes);
  const setListenMinutes = useEditor((s) => s.setListenMinutes);
  return (
    <View style={styles.listenRow}>
      <Text style={styles.listenLabel}>🌙 얼마나</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listenChips}>
        {LISTEN_OPTIONS.map((o) => {
          const active = listenMinutes === o.minutes;
          return (
            <Pressable key={o.minutes} accessibilityRole="button" accessibilityState={{ selected: active }}
              accessibilityLabel={`${o.label} 듣기`} onPress={() => setListenMinutes(o.minutes)}
              style={[styles.mini, active && styles.miniOn]} testID={`listen-${o.minutes}`}>
              <Text style={[styles.miniText, active && styles.miniTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  volRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingBottom: 2 },
  volLabel: { color: colors.muted, fontSize: 11 },
  slider: { flex: 1, height: 28 },
  volValue: { color: colors.text, fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] },
  removeText: { color: colors.danger, fontSize: 11, fontWeight: '600' },
  listenRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listenLabel: { color: colors.muted, fontSize: 12 },
  listenChips: { gap: 6 },
  mini: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  miniOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  miniTextOn: { color: '#fff' },
});
