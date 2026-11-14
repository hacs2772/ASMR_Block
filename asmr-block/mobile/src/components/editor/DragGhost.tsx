import { Animated, StyleSheet } from 'react-native';
import { categoryFallbackColor } from '@/theme';
import { Brick } from './Brick';
import { dragMotion, useDrag } from './drag';
import { useCategoryIcon } from './useCategoryIcon';

/**
 * 끄는 동안 손가락을 따라다니는 블록. origin: 이 컴포넌트를 담은 화면의 window 좌표.
 * 위치·기울기·들어 올림은 Animated 값으로만 바뀌어서 손가락을 바로바로 따라감 (다시 그리기 없음)
 */
export function DragGhost({ origin }: { origin: { x: number; y: number } }) {
  const source = useDrag((s) => s.source);
  const grabX = useDrag((s) => s.grabX);
  const grabY = useDrag((s) => s.grabY);
  const width = useDrag((s) => s.width);
  const height = useDrag((s) => s.height);
  const iconOf = useCategoryIcon();
  if (!source) return null;

  const { pos, lift, tilt } = dragMotion;
  const translateX = Animated.add(pos.x, -(origin.x + grabX));
  const translateY = Animated.add(pos.y, -(origin.y + grabY));
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const rotate = tilt.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  // 들어 올리면 살짝 위로 떠서 손가락에 가려지지 않음
  const rise = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ghost, { transform: [{ translateX }, { translateY }, { translateY: rise }, { rotate }, { scale }] }]}
    >
      <Brick color={source.block.category?.color ?? categoryFallbackColor} width={width} height={height}
        icon={iconOf(source.block.category)} title={source.block.title} minutes={source.block.duration / 60} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute', left: 0, top: 0, zIndex: 100, opacity: 0.96,
    shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 12 }, elevation: 14,
  },
});
