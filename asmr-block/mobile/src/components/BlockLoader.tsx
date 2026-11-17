import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { shade } from '@/components/editor/colors';
import { colors, triggerColor, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 웹은 네이티브 애니메이션이 없어서 JS로 */
const NATIVE = Platform.OS !== 'web';

/** 앱 아이콘과 같은 블록 셋. 막대는 트리거마다 다른 박자: 탭핑 톡톡 · 바스락 촘촘 · 귓속말 잔잔 */
const BRICKS = [
  { color: triggerColor.tap, bars: [0.35, 1, 0.35, 0.9], speeds: [170, 260, 210, 240], low: 0.25 },
  { color: triggerColor.crinkle, bars: [0.75, 0.95, 0.7, 1, 0.8], speeds: [120, 150, 110, 140, 130], low: 0.5 },
  { color: triggerColor.whisper, bars: [0.5, 0.75, 0.6, 0.8], speeds: [520, 640, 580, 700], low: 0.55 },
];

const SIZES = {
  small: { w: 26, h: 20, gap: 7, bar: 2, edge: 1, stud: 4 },
  large: { w: 54, h: 40, gap: 18, bar: 4, edge: 1.5, stud: 7 },
} as const;
type Size = keyof typeof SIZES;

/** "동작 줄이기"를 켠 사람에게는 멈춘 블록만 */
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return reduce;
}

/**
 * 로딩 표시: 빙글빙글 원 대신 블록 셋이 떨어졌다가 딸깍 붙고, 다시 떨어지기를 반복.
 * 블록 안의 소리 막대도 트리거마다 다른 박자로 움직임.
 */
export function BlockLoader({ size = 'large', label, style }: { size?: Size; label?: string; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const reduce = useReduceMotion();
  const [join] = useState(() => new Animated.Value(0));
  const d = SIZES[size];

  useEffect(() => {
    if (reduce) {
      join.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(140),
      // 딸깍: 살짝 지나쳤다가 제자리 (back easing)
      Animated.timing(join, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(2.4)), useNativeDriver: NATIVE }),
      Animated.delay(700),
      Animated.timing(join, { toValue: 0, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [join, reduce]);

  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel={label ?? t('common.loading')} testID="block-loader">
      <View style={[styles.row, { marginRight: d.stud }]}>
        {BRICKS.map((b, i) => {
          const apart = (i - 1) * d.gap;
          const translateX = join.interpolate({ inputRange: [0, 1], outputRange: [apart, 0] });
          return (
            <Animated.View key={b.color} style={{ transform: [{ translateX }] }}>
              <LoaderBrick color={b.color} bars={b.bars} speeds={b.speeds} low={b.low} size={size} still={reduce} />
            </Animated.View>
          );
        })}
      </View>
      {label ? <Text style={[styles.label, size === 'small' && { fontSize: 11 }]}>{label}</Text> : null}
    </View>
  );
}

/** 로딩용 작은 블록 (앱의 C안 블록과 같은 모양: 각진 모서리 · 진한 테두리 · 아래 두께 · 네모 돌기) */
function LoaderBrick({ color, bars, speeds, low, size, still }: {
  color: string; bars: number[]; speeds: number[]; low: number; size: Size; still: boolean;
}) {
  const d = SIZES[size];
  const base = shade(color, -0.12);
  const edge = shade(base, -0.42);
  const barColor = shade(color, 0.72);
  const studH = Math.max(3, Math.round(d.h * 0.26));
  return (
    <View style={{ width: d.w, height: d.h }}>
      <View style={styles.drop} />
      {[d.h * 0.17, d.h * 0.57].map((y) => (
        <View key={y} style={[styles.stud, { top: y, height: studH, width: d.stud, right: -d.stud + 1, backgroundColor: base, borderColor: edge, borderWidth: d.edge }]} />
      ))}
      <View style={[styles.body, { backgroundColor: base, borderColor: edge, borderWidth: d.edge }]}>
        <View style={[styles.top, { backgroundColor: shade(base, 0.32), height: size === 'small' ? 2 : 3 }]} />
        <View style={[styles.bottom, { backgroundColor: shade(base, -0.24), height: size === 'small' ? 3 : 5 }]} />
        <View style={[styles.bars, { paddingHorizontal: d.w * 0.14 }]}>
          {bars.map((h, i) => (
            <Bar key={i} height={d.h * 0.52 * h} width={d.bar} color={barColor} speed={speeds[i]} low={low} still={still} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Bar({ height, width, color, speed, low, still }: { height: number; width: number; color: string; speed: number; low: number; still: boolean }) {
  const [level] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(level, { toValue: low, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      Animated.timing(level, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [level, speed, low, still]);
  return <Animated.View style={{ width, height, borderRadius: width / 2, backgroundColor: color, transform: [{ scaleY: level }] }} />;
}

/** 앱을 켤 때: 첫 화면(정지 그림) 다음에 이어지는 움직이는 시작 화면 */
export function StartupScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.startup} testID="startup">
      <BlockLoader size="large" />
      <Text style={styles.brand}>ASMR <Text style={{ color: colors.primaryText }}>Block</Text></Text>
      <Text style={styles.tagline}>{t('startup.tagline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  row: { flexDirection: 'row' },
  drop: { position: 'absolute', left: 1, right: 1, top: 3, bottom: -3, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.42)' },
  stud: { position: 'absolute', borderLeftWidth: 0, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  body: { flex: 1, borderRadius: 3, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bars: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.muted, fontSize: 13 },
  startup: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 6 },
  brand: { color: colors.text, fontSize: 24, marginTop: 18, fontFamily: fonts.display },
  tagline: { color: colors.muted, fontSize: 13 },
});
