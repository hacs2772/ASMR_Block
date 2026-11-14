import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { IconName } from '@/components/ui';
import { shade } from './colors';
import { colors } from '@/theme';

export const BRICK_HEIGHT = 46;
export const MIX_BRICK_HEIGHT = 34;
/** 이 폭보다 길면 블록 안에 이름까지 */
const NAME_MIN_WIDTH = 90;
const STUD_WIDTH = 7;

type Props = {
  color: string;
  width: number;
  height?: number;
  icon: IconName | null;
  title: string;
  selected?: boolean;
  /** 끌고 있는 블록의 원래 자리 (흐리게 + 점선). 손가락 아래 요소가 사라지면 끌기가 멈춰서 모양은 그대로 둠 */
  hole?: boolean;
  /** 내 블록함에 없는 블록 */
  dimmed?: boolean;
  /** 이 폭 이상이면 아이콘 옆에 글자 (기본 90) */
  labelMinWidth?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 옆으로 누운 레고 블록. 오른쪽 돌기 2개가 다음 블록 속으로 끼워짐
 * (뒤에 그려지는 블록이 앞 블록의 돌기를 덮어서 딱 붙은 것처럼 보임).
 * 폭 = 소리 길이, 색 = 카테고리, 아이콘으로 구분하고 긴 블록에만 이름.
 */
export function Brick({ color, width, height = BRICK_HEIGHT, icon, title, selected, hole, dimmed, labelMinWidth = NAME_MIN_WIDTH, style }: Props) {
  const base = shade(color, -0.2);
  const studColor = shade(base, 0.25);
  const studHeight = Math.round(height * 0.24);
  const showName = width >= labelMinWidth;
  const iconSize = height >= BRICK_HEIGHT ? 17 : 14;

  return (
    <View style={[{ width, height, opacity: hole ? 0.3 : dimmed ? 0.45 : 1 }, selected && !hole && styles.lifted, style]} pointerEvents="box-none">
      {/* 오른쪽 돌기 */}
      <View style={[styles.stud, { top: height * 0.16, height: studHeight, backgroundColor: studColor }]} />
      <View style={[styles.stud, { bottom: height * 0.22, height: studHeight, backgroundColor: studColor }]} />
      <LinearGradient
        colors={[shade(base, 0.3), base, base, shade(base, -0.25)]}
        locations={[0, 0.3, 0.7, 1]}
        style={[styles.body, { height }, selected && styles.selected]}
      >
        <View style={styles.seam} />
        <View style={[styles.content, !showName && styles.iconOnly]}>
          {icon && <Ionicons name={icon} size={iconSize} color="#fff" />}
          {showName && <Text style={[styles.name, height < BRICK_HEIGHT && { fontSize: 12 }]} numberOfLines={1}>{title}</Text>}
        </View>
      </LinearGradient>
      {hole && <View style={[styles.hole, StyleSheet.absoluteFill]} pointerEvents="none" />}
    </View>
  );
}

/** 블록 상자에서 끌어올 때 첫째 줄에 놓일 자리 */
export function DropSlot({ width, height = BRICK_HEIGHT, style }: { width: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hole, { width, height }, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  body: { borderRadius: 9, overflow: 'hidden', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.28)' },
  selected: { borderWidth: 2.5, borderColor: '#FFFFFF', borderBottomWidth: 3 },
  lifted: { transform: [{ translateY: -6 }], zIndex: 50 },
  seam: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(0,0,0,0.22)' },
  stud: {
    position: 'absolute', right: -STUD_WIDTH + 1, width: STUD_WIDTH,
    borderTopRightRadius: 5, borderBottomRightRadius: 5,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  iconOnly: { justifyContent: 'center', paddingHorizontal: 2 },
  name: { color: '#fff', fontSize: 13, fontWeight: '800', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } },
  hole: { borderRadius: 9, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primaryText, backgroundColor: colors.primarySoft },
});
