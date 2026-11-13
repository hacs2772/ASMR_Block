import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { waveData, waveGroupOf } from '@/lib/waveform';

type Props = { groupCode: string | null | undefined; seed: number; color: string; height?: number; bars?: number };

/** 트리거 모양 파형 (막대 bars개, 가로는 부모 폭에 맞춤) */
export const Waveform = memo(function Waveform({ groupCode, seed, color, height = 34, bars = 26 }: Props) {
  const data = waveData(waveGroupOf(groupCode), seed, bars);
  return (
    <View style={[styles.row, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {data.map((v, i) => (
        <View key={i} style={[styles.bar, { height: Math.max(2, v * height), backgroundColor: color }]} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { flex: 1, borderRadius: 1.5, maxWidth: 4 },
});
