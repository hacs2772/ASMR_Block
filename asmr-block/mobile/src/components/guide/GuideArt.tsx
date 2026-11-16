import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Brick } from '@/components/editor/Brick';
import type { GuideArtKind } from '@/lib/guide';
import { colors, radius, triggerColor } from '@/theme';
import { useTranslation } from 'react-i18next';

/**
 * 사용법 카드 위의 움직이는 그림 (264×150). 진짜 화면처럼 바닥판·블록함·블록으로 보여 줌.
 * "동작 줄이기"를 켠 사람에게는 끝난 모습 그대로 멈춰 있음
 */
export const ART_W = 264;
export const ART_H = 150;
const BRICK_H = 30;
const NO_NAME = 999; // 그림 속 블록에는 이름을 안 씀

function useLoop(duration: number) {
  const [p] = useState(() => new Animated.Value(0));
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v)).catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (reduce) {
      p.setValue(0.75);
      return undefined;
    }
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [p, duration, reduce]);
  return p;
}

const at = (p: Animated.Value, input: number[], output: number[]) =>
  p.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

function Piece({ color, icon, width, x, y }: { color: string; icon: Parameters<typeof Brick>[0]['icon']; width: number; x: number; y: number }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      <Brick color={color} width={width} height={BRICK_H} icon={icon} title="" labelMinWidth={NO_NAME} />
    </View>
  );
}

/** 블록함 → 바닥판으로 꾹 눌러 끌어 놓기 */
function DragArt() {
  const { t } = useTranslation();
  const p = useLoop(3400);
  const from = { x: 102, y: 108 };
  const to = { x: 152, y: 18 };
  const tx = at(p, [0, 0.24, 0.6, 1], [0, 0, to.x - from.x, to.x - from.x]);
  const ty = at(p, [0, 0.24, 0.6, 1], [0, 0, to.y - from.y, to.y - from.y]);
  const lift = at(p, [0, 0.12, 0.2, 0.6, 0.66, 0.7, 1], [1, 1, 1.1, 1.1, 0.94, 1, 1]);
  const finger = at(p, [0, 0.06, 0.12, 0.6, 0.68, 1], [0, 0, 0.9, 0.9, 0, 0]);
  const press = at(p, [0.12, 0.17, 0.22], [1.25, 0.85, 0.95]);
  const show = at(p, [0, 0.04, 0.9, 1], [0, 1, 1, 0]);
  const slot = at(p, [0, 0.24, 0.3, 0.56, 0.62, 1], [0, 0, 1, 1, 0, 0]);
  return (
    <View style={art.box} testID="guide-art-drag">
      <View style={[art.plate, { top: 6, height: 58 }]}>
        <Text style={art.tag}>{t('guideArt.plate')}</Text>
      </View>
      <Piece color={triggerColor.tap} icon="hand-left" width={64} x={14} y={18} />
      <Piece color={triggerColor.rain} icon="rainy" width={72} x={80} y={18} />
      <Animated.View style={[art.slot, { left: to.x, top: to.y, width: 62, opacity: slot }]} />
      <View style={[art.shelf, { top: 92, height: 54 }]}>
        <Text style={art.tag}>{t('guideArt.myBlocks')}</Text>
      </View>
      <Piece color={triggerColor.whisper} icon="chatbubble-ellipses" width={58} x={22} y={from.y} />
      <View style={[art.ghost, { left: from.x, top: from.y, width: 62 }]} />
      <Piece color={triggerColor.slime} icon="color-fill" width={58} x={186} y={from.y} />
      <Animated.View style={{ position: 'absolute', left: from.x, top: from.y, opacity: show, transform: [{ translateX: tx }, { translateY: ty }, { scale: lift }] }}>
        <Brick color={triggerColor.crinkle} width={62} height={BRICK_H} icon="document-text" title="" labelMinWidth={NO_NAME} />
        <Animated.View style={[art.finger, { left: 18, top: 8, opacity: finger, transform: [{ scale: press }] }]} />
      </Animated.View>
    </View>
  );
}

/** 상점 카드의 "블록 담기" → 내 블록함으로 쏙 */
function CollectArt() {
  const { t } = useTranslation();
  const p = useLoop(3000);
  const pulse = at(p, [0, 0.1, 0.16, 0.22, 1], [1, 1, 0.9, 1, 1]);
  const fly = at(p, [0, 0.22, 0.62, 1], [0, 0, 1, 1]);
  const tx = fly.interpolate({ inputRange: [0, 1], outputRange: [0, 136] });
  const ty = fly.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -26, 6] });
  const sc = fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
  const op = at(p, [0, 0.22, 0.24, 0.6, 0.66, 1], [0, 0, 1, 1, 0, 0]);
  const bump = at(p, [0, 0.6, 0.66, 0.74, 1], [1, 1, 1.18, 1, 1]);
  return (
    <View style={art.box} testID="guide-art-collect">
      <View style={[art.plate, { left: 6, top: 10, width: 128, height: 130 }]} />
      <Piece color={triggerColor.tap} icon="hand-left" width={92} x={24} y={34} />
      <Animated.View style={[art.pill, { left: 26, top: 94, transform: [{ scale: pulse }] }]}>
        <Ionicons name="add-circle" size={13} color={colors.white} />
        <Text style={art.pillText}>{t('guideArt.add')}</Text>
      </Animated.View>
      <Ionicons name="arrow-forward" size={18} color={colors.faint} style={{ position: 'absolute', left: 148, top: 62 }} />
      <Animated.View style={[art.tray, { transform: [{ scale: bump }] }]}>
        <Ionicons name="file-tray-full" size={34} color={colors.primaryText} />
        <Text style={art.trayText}>{t('guideArt.myBlocks')}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 40, top: 34, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] }}>
        <Brick color={triggerColor.tap} width={60} height={BRICK_H} icon="hand-left" title="" labelMinWidth={NO_NAME} />
      </Animated.View>
    </View>
  );
}

/** 사전 guideArt.* 키 */
const TIMES = ['loop', 'm30', 'h1', 'h3', 'h8'];
const CHIP_W = 48;
/** 얼마나 들을까요? 고르기 → 저장 → 완성본 만드는 중 */
function TimeArt() {
  const { t } = useTranslation();
  const p = useLoop(3600);
  const x = at(p, [0, 0.12, 0.2, 0.32, 0.4, 1], [CHIP_W * 1, CHIP_W * 1, CHIP_W * 2, CHIP_W * 2, CHIP_W * 4, CHIP_W * 4]);
  const save = at(p, [0, 0.46, 0.52, 0.58, 1], [1, 1, 0.9, 1, 1]);
  const fill = at(p, [0, 0.58, 0.95, 1], [-200, -200, 0, 0]);
  return (
    <View style={art.box} testID="guide-art-time">
      <Text style={[art.caption, { top: 6 }]}>{t('guideArt.howLong')}</Text>
      <View style={{ position: 'absolute', left: 12, top: 28, flexDirection: 'row' }}>
        {TIMES.map((k) => <View key={k} style={art.chip}><Text style={art.chipText} numberOfLines={1}>{t(`guideArt.${k}`)}</Text></View>)}
        <Animated.View style={[art.chipOn, { transform: [{ translateX: x }] }]} />
      </View>
      <Animated.View style={[art.save, { transform: [{ scale: save }] }]}><Text style={art.saveText}>{t('guideArt.save')}</Text></Animated.View>
      <View style={art.barTrack}>
        <Animated.View style={[art.barFill, { transform: [{ translateX: fill }] }]} />
      </View>
      <Text style={[art.caption, { top: 126 }]}>{t('guideArt.building')}</Text>
    </View>
  );
}

/** 화면을 꺼도 들리고, 정한 시간에 스르르 */
function SleepArt() {
  const { t } = useTranslation();
  const p = useLoop(3200);
  const dim = at(p, [0, 0.3, 0.45, 0.85, 1], [0, 0, 0.55, 0.55, 0]);
  const bars = [0, 1, 2, 3].map((i) => at(p, [0, 0.25, 0.5, 0.75, 1], i % 2 ? [0.5, 1, 0.4, 0.9, 0.5] : [1, 0.4, 0.9, 0.5, 1]));
  return (
    <View style={art.box} testID="guide-art-sleep">
      <View style={art.phone}>
        <Text style={art.clock}>{t('guideArt.clock')}</Text>
        <View style={art.lockCard}>
          <View style={{ flex: 1 }}>
            <Text style={art.lockTitle} numberOfLines={1}>{t('guideArt.comboName')}</Text>
            <View style={{ flexDirection: 'row', gap: 3, height: 16, alignItems: 'center', marginTop: 4 }}>
              {bars.map((s, i) => <Animated.View key={i} style={[art.bar, { transform: [{ scaleY: s }] }]} />)}
            </View>
          </View>
          <Ionicons name="pause" size={16} color={colors.text} />
        </View>
        <Text style={art.sleepText}>{t('guideArt.fades')}</Text>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, art.dim, { opacity: dim }]} />
      </View>
      <Ionicons name="moon" size={22} color={colors.primaryText} style={{ position: 'absolute', right: 34, top: 18 }} />
    </View>
  );
}

/** 바닥판 블록 누르면 복제·빼기, 레이어드로 둘째 줄 */
function EditArt() {
  const { t } = useTranslation();
  const p = useLoop(3400);
  const bubble = at(p, [0, 0.08, 0.16, 0.5, 0.58, 1], [0, 0, 1, 1, 0, 0]);
  const layer = at(p, [0, 0.5, 0.62, 0.92, 1], [0, 0, 1, 1, 0]);
  const layerX = at(p, [0, 0.5, 0.62, 1], [40, 40, 0, 0]);
  return (
    <View style={art.box} testID="guide-art-edit">
      <View style={[art.plate, { top: 34, height: 104 }]} />
      <Piece color={triggerColor.tap} icon="hand-left" width={66} x={16} y={52} />
      <View style={{ position: 'absolute', left: 86, top: 52 }}>
        <Brick color={triggerColor.crinkle} width={66} height={BRICK_H} icon="document-text" title="" labelMinWidth={NO_NAME} selected />
      </View>
      <Piece color={triggerColor.whisper} icon="chatbubble-ellipses" width={66} x={156} y={52} />
      <Animated.View style={[art.bubble, { opacity: bubble }]}>
        <Text style={art.bubbleText}>{t('guideArt.copyRemove')}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 60, top: 98, opacity: layer, transform: [{ translateX: layerX }] }}>
        <Brick color={triggerColor.rain} width={120} height={24} icon="rainy" title="" labelMinWidth={NO_NAME} />
      </Animated.View>
      <Animated.Text style={[art.layerTag, { opacity: layer }]}>{t('guideArt.layered')}</Animated.Text>
    </View>
  );
}

export function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    case 'collect': return <CollectArt />;
    case 'drag': return <DragArt />;
    case 'time': return <TimeArt />;
    case 'sleep': return <SleepArt />;
    case 'edit': return <EditArt />;
    default: return null;
  }
}

const art = StyleSheet.create({
  box: { width: ART_W, height: ART_H, alignSelf: 'center' },
  plate: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.plate, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  shelf: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.cardActive, borderRadius: radius.sm },
  tag: { position: 'absolute', right: 8, top: 4, color: colors.faint, fontSize: 9, fontWeight: '700' },
  slot: { position: 'absolute', height: BRICK_H, borderRadius: 5, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primaryText },
  ghost: { position: 'absolute', height: BRICK_H, borderRadius: 5, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
  finger: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 2, borderColor: colors.white,
  },
  pill: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  tray: { position: 'absolute', left: 184, top: 46, alignItems: 'center', gap: 4 },
  trayText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  caption: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700' },
  chip: { width: CHIP_W - 4, marginRight: 4, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  chipOn: { position: 'absolute', left: 0, top: 0, width: CHIP_W - 4, height: 26, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  save: { position: 'absolute', left: 92, top: 70, width: 80, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  barTrack: { position: 'absolute', left: 32, top: 112, width: 200, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill: { width: 200, height: 6, backgroundColor: colors.primary },
  phone: {
    position: 'absolute', left: 62, top: 4, width: 140, height: 142, borderRadius: 18, borderWidth: 2, borderColor: colors.borderStrong,
    backgroundColor: colors.plate, padding: 10, overflow: 'hidden',
  },
  clock: { color: colors.text, fontSize: 18, fontWeight: '300', textAlign: 'center', marginTop: 6 },
  lockCard: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.cardActive, borderRadius: 10, padding: 8 },
  lockTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  bar: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.primaryText },
  sleepText: { marginTop: 10, color: colors.primaryText, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  dim: { backgroundColor: '#000' },
  bubble: { position: 'absolute', left: 78, top: 6, backgroundColor: colors.cardActive, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 10, paddingVertical: 6 },
  bubbleText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  layerTag: { position: 'absolute', left: 16, top: 104, color: colors.faint, fontSize: 9, fontWeight: '700' },
});
