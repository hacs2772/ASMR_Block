import { StyleSheet, View } from 'react-native';
import { categoryFallbackColor } from '@/theme';
import { Brick } from './Brick';
import { useDrag } from './drag';
import { useCategoryIcon } from './useCategoryIcon';

/** 끄는 동안 손가락을 따라다니는 블록. origin: 이 컴포넌트를 담은 화면의 window 좌표 */
export function DragGhost({ origin }: { origin: { x: number; y: number } }) {
  const { source, x, y, grabX, grabY, width, height } = useDrag();
  const iconOf = useCategoryIcon();
  if (!source) return null;
  return (
    <View pointerEvents="none" style={[styles.ghost, { left: x - origin.x - grabX, top: y - origin.y - grabY }]}>
      <Brick color={source.block.category?.color ?? categoryFallbackColor} width={width} height={height}
        icon={iconOf(source.block.category)} title={source.block.title} />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute', zIndex: 100, opacity: 0.95, transform: [{ scale: 1.08 }, { rotate: '-2deg' }],
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
});
