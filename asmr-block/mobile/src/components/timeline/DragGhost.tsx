import { StyleSheet, View } from 'react-native';
import { categoryFallbackColor } from '@/theme';
import { useDrag } from './dragStore';
import { LegoBrick } from './LegoBrick';

/** 드래그 중 손가락을 따라다니는 블록. origin: 이 컴포넌트를 담은 화면의 window 좌표 */
export function DragGhost({ origin }: { origin: { x: number; y: number } }) {
  const { source, x, y, grabX, grabY, width, preview } = useDrag();
  if (!source) return null;
  const repeat = source.kind === 'item' ? source.repeat : 1;
  return (
    <View pointerEvents="none" style={[styles.ghost, { left: x - origin.x - grabX, top: y - origin.y - grabY }]}>
      <LegoBrick color={source.block.category?.color ?? categoryFallbackColor} width={Math.max(60, width)}
        title={source.block.title} repeat={repeat} seconds={source.block.duration * repeat} selected={!!preview} />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute', zIndex: 100, opacity: 0.92,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
});
