import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatDuration } from '@/lib/format';

export const BRICK_HEIGHT = 44;
const STUD_SIZE = 9;
const STUD_PITCH = 16;
const MAX_STUDS = 120;

type Props = {
  color: string;
  width: number;
  title: string;
  /** 반복 횟수 (2 이상이면 ×N 표시 + 이음매) */
  repeat?: number;
  /** 표시할 총 길이(초) */
  seconds?: number;
  selected?: boolean;
  faded?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 레고 블록 모양: 위에 돌기(스터드)가 있고, 아래는 살짝 어두운 그림자.
 * 반복된 블록은 사이사이 이음매를 그려서 "같은 블록이 붙어 있는" 느낌.
 */
export function LegoBrick({ color, width, title, repeat = 1, seconds, selected, faded, height = BRICK_HEIGHT, style }: Props) {
  const w = Math.max(3, width);
  const pitch = Math.max(STUD_PITCH, w / MAX_STUDS);
  const studCount = Math.max(1, Math.floor((w - 4) / pitch));
  const showLabel = w >= 56;
  const showRepeat = repeat > 1 && w >= 34;
  const seams = repeat > 1 && w / repeat >= 6 ? Math.min(repeat - 1, 60) : 0;

  return (
    <View style={[{ width: w, height: height + STUD_SIZE / 2, opacity: faded ? 0.35 : 1 }, style]} pointerEvents="box-none">
      {/* 돌기 */}
      <View style={[styles.studRow, { width: w }]} pointerEvents="none">
        {Array.from({ length: studCount }, (_, i) => (
          <View key={i} style={[styles.stud, { left: 2 + i * pitch + (pitch - STUD_SIZE) / 2, backgroundColor: color }]} />
        ))}
      </View>
      {/* 몸통 */}
      <View style={[styles.body, { height, backgroundColor: color }, selected && styles.selected]}>
        {seams > 0 &&
          Array.from({ length: seams }, (_, i) => (
            <View key={i} pointerEvents="none" style={[styles.seam, { left: ((i + 1) * w) / repeat - 1 }]} />
          ))}
        <View style={styles.shade} pointerEvents="none" />
        {showLabel && (
          <View style={styles.labelBox} pointerEvents="none">
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {seconds !== undefined && <Text style={styles.time} numberOfLines={1}>{formatDuration(seconds)}</Text>}
          </View>
        )}
        {showRepeat && (
          <View style={styles.badge} pointerEvents="none">
            <Text style={styles.badgeText}>×{repeat}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studRow: { height: STUD_SIZE / 2, position: 'relative' },
  stud: {
    position: 'absolute', top: -STUD_SIZE / 2 + 1, width: STUD_SIZE, height: STUD_SIZE,
    borderRadius: STUD_SIZE / 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)',
  },
  body: {
    borderRadius: 4, overflow: 'hidden', justifyContent: 'center',
    borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.28)',
  },
  selected: { borderWidth: 2, borderColor: '#FFFFFF', borderBottomWidth: 4 },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, backgroundColor: 'rgba(255,255,255,0.18)' },
  seam: { position: 'absolute', top: 4, bottom: 4, width: 1.5, backgroundColor: 'rgba(0,0,0,0.25)' },
  labelBox: { paddingHorizontal: 7, paddingRight: 30 },
  title: { color: '#fff', fontSize: 12, fontWeight: '800' },
  time: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },
  badge: {
    position: 'absolute', right: 4, top: 4, backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
