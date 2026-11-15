import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect, SvgXml } from 'react-native-svg';
import type { BlockDesign } from '@/api/types';
import type { IconName } from '@/components/ui';
import { STICKERS } from '@/lib/stickers';
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
  /** 소리 길이(분). 주면 겉면에 1분마다 홈을 팜 */
  minutes?: number;
  selected?: boolean;
  /** 끌고 있는 블록의 원래 자리 (흐리게 + 점선). 손가락 아래 요소가 사라지면 끌기가 멈춰서 모양은 그대로 둠 */
  hole?: boolean;
  /** 내 블록함에 없는 블록 */
  dimmed?: boolean;
  /** 이 폭 이상이면 아이콘 옆에 글자 (기본 90) */
  labelMinWidth?: number;
  /** 블록 꾸미기(C안): 사진 → 없으면 스티커 + 무늬 → 없으면 아이콘. hasVideo면 왼쪽 위 ▶ */
  design?: BlockDesign | null;
  style?: StyleProp<ViewStyle>;
};

/** 홈은 너무 촘촘하면 지저분해서 최소 이 간격일 때만 */
const MIN_GROOVE_GAP = 10;
const EDGE = 1.5;

/**
 * 옆으로 누운 블록 (각진 모양 + 또렷한 테두리 + 아래 두께).
 * 오른쪽 네모 돌기 2개가 다음 블록 속으로 끼워짐 (뒤에 그려지는 블록이 앞 블록의 돌기를 덮음).
 * 폭 = 소리 길이, 겉면 홈 한 칸 = 1분, 색 = 트리거, 아이콘으로 구분하고 넓으면 글자까지.
 */
export function Brick({ color, width, height = BRICK_HEIGHT, icon, title, minutes, selected, hole, dimmed, labelMinWidth = NAME_MIN_WIDTH, design, style }: Props) {
  const base = shade(color, -0.12);
  const edge = shade(base, -0.42);
  const top = shade(base, 0.32);
  const bottom = shade(base, -0.24);
  const studHeight = Math.max(6, Math.round(height * 0.26));
  const showName = width >= labelMinWidth;
  const iconSize = height >= BRICK_HEIGHT ? 17 : 14;
  const gap = minutes && minutes > 0 ? width / minutes : 0;
  const cover = design?.coverUrl ?? null;
  const stickers = !cover ? (design?.stickers ?? []).filter((k) => STICKERS[k]) : [];
  const decorated = !!cover || stickers.length > 0;
  const grooves = gap >= MIN_GROOVE_GAP && !cover ? Math.floor(minutes! - 0.05) : 0;

  return (
    <View style={[{ width, height, opacity: hole ? 0.3 : dimmed ? 0.45 : 1 }, selected && !hole && styles.lifted, style]} pointerEvents="box-none">
      {/* 바닥 그림자 받침 (입체감) */}
      <View style={styles.drop} pointerEvents="none" />
      {/* 오른쪽 네모 돌기 */}
      {[height * 0.17, height * 0.57].map((y) => (
        <View key={y} style={[styles.stud, { top: y, height: studHeight, backgroundColor: base, borderColor: edge }]}>
          <View style={[styles.studTop, { backgroundColor: top }]} />
        </View>
      ))}
      <View style={[styles.body, { height, backgroundColor: base, borderColor: selected ? colors.white : edge }, selected && styles.selected]}>
        {cover && (
          <>
            <Image source={{ uri: cover }} style={styles.fill} resizeMode="cover" />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0.4, 1]} style={styles.fill} />
          </>
        )}
        {stickers.length > 0 && design?.pattern !== 'none' && <PatternLayer kind={design?.pattern ?? 'dots'} />}
        <View style={[styles.topLight, { backgroundColor: top }]} />
        <View style={[styles.bottomShade, { backgroundColor: cover ? base : bottom }]} />
        {Array.from({ length: grooves }, (_, i) => (
          <View key={i} style={[styles.groove, { left: gap * (i + 1) - EDGE - 1 }]}>
            <View style={styles.grooveDark} />
            <View style={styles.grooveLight} />
          </View>
        ))}
        {decorated ? (
          <>
            {stickers.length > 0 && (
              <View style={styles.stickers} pointerEvents="none">
                {stickers.map((k) => <SvgXml key={k} xml={STICKERS[k].svg} width={height * 0.75} height={height * 0.56} />)}
              </View>
            )}
            {showName && <Text style={styles.time} numberOfLines={1}>{title}</Text>}
          </>
        ) : (
          <View style={[styles.content, !showName && styles.iconOnly]}>
            {icon && <Ionicons name={icon} size={iconSize} color={colors.white} />}
            {showName && <Text style={[styles.name, height < BRICK_HEIGHT && { fontSize: 12 }]} numberOfLines={1}>{title}</Text>}
          </View>
        )}
        {design?.hasVideo && (
          <View style={styles.film} pointerEvents="none">
            <Text style={styles.filmText}>▶{width > 100 && height >= BRICK_HEIGHT ? ' 영상' : ''}</Text>
          </View>
        )}
      </View>
      {hole && <View style={[styles.hole, StyleSheet.absoluteFill]} pointerEvents="none" />}
    </View>
  );
}

/** 스티커 블록 무늬 (점 · 빗금) */
function PatternLayer({ kind }: { kind: 'dots' | 'lines' | 'none' }) {
  return (
    <Svg style={styles.fill} pointerEvents="none">
      <Defs>
        <Pattern id="p" width={9} height={9} patternUnits="userSpaceOnUse">
          {kind === 'dots'
            ? <Circle cx={4.5} cy={4.5} r={1.4} fill="rgba(255,255,255,0.18)" />
            : <Line x1={0} y1={9} x2={9} y2={0} stroke="rgba(255,255,255,0.13)" strokeWidth={2} />}
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#p)" />
    </Svg>
  );
}

/** 블록 상자에서 끌어올 때 첫째 줄에 놓일 자리 */
export function DropSlot({ width, height = BRICK_HEIGHT, style }: { width: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.hole, { width, height }, style]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  body: { borderRadius: 3, borderWidth: EDGE, overflow: 'hidden', justifyContent: 'center' },
  drop: { position: 'absolute', left: 1, right: 1, top: 3, bottom: -3, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.42)' },
  topLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 3 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5 },
  groove: { position: 'absolute', top: 3, bottom: 5, width: 2, flexDirection: 'row' },
  grooveDark: { width: 1, backgroundColor: 'rgba(0,0,0,0.28)' },
  grooveLight: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  selected: { borderWidth: 2.5 },
  lifted: { transform: [{ translateY: -6 }], zIndex: 50 },
  stud: {
    position: 'absolute', right: -STUD_WIDTH + 1, width: STUD_WIDTH, overflow: 'hidden',
    borderWidth: EDGE, borderLeftWidth: 0, borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  studTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 2 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  iconOnly: { justifyContent: 'center', paddingHorizontal: 2 },
  name: { color: colors.white, fontSize: 13, fontWeight: '800', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } },
  hole: { borderRadius: 3, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primaryText, backgroundColor: colors.primarySoft },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  stickers: { position: 'absolute', left: 4, right: 4, top: 3, bottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  time: {
    position: 'absolute', right: 5, bottom: 6, color: colors.white, fontSize: 11, fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.75)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 },
  },
  film: { position: 'absolute', left: 3, top: 4, height: 14, paddingHorizontal: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center' },
  filmText: { color: colors.white, fontSize: 9, fontWeight: '800' },
});
