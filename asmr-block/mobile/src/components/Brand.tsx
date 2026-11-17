import { StyleSheet, Text, View } from 'react-native';
import { Brick } from '@/components/editor/Brick';
import { shade } from '@/components/editor/colors';
import type { IconName } from '@/components/ui';
import { colors, fonts, triggerColor } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 앱 이름 표시: 분홍 블록 + ASMR Block */
export function BrandTitle() {
  return (
    <View style={styles.brand} accessibilityRole="header" accessibilityLabel="ASMR Block">
      <View style={styles.logo}>
        <View style={[styles.logoStud, { top: 3 }]} />
        <View style={[styles.logoStud, { bottom: 4 }]} />
      </View>
      <Text style={styles.name}>ASMR <Text style={{ color: colors.primaryText }}>Block</Text></Text>
    </View>
  );
}

const STACK: { label: string; color: string; icon: IconName; width: number; minutes: number }[] = [
  { label: 'brand.tap', color: triggerColor.tap, icon: 'hand-left', width: 92, minutes: 3 },
  { label: 'brand.crinkle', color: triggerColor.crinkle, icon: 'bag-handle', width: 104, minutes: 3.5 },
  { label: 'brand.whisper', color: triggerColor.whisper, icon: 'chatbubble-ellipses', width: 98, minutes: 3.3 },
];

/** 홈 첫 화면: 트리거 블록 3개가 딸깍 이어진 모습 (블록을 쌓는다는 걸 바로 보여줌) */
export function BrickStack() {
  const { t } = useTranslation();
  return (
    <View style={styles.stack} accessibilityLabel={t('brand.stack')}>
      {STACK.map((b) => (
        <Brick key={b.label} color={b.color} width={b.width} height={34} icon={b.icon} title={t(b.label)} minutes={b.minutes} labelMinWidth={60} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 22, height: 16, borderRadius: 2, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: shade(colors.primary, -0.42), borderBottomWidth: 3 },
  logoStud: { position: 'absolute', right: -5, width: 4, height: 4, borderTopRightRadius: 1, borderBottomRightRadius: 1, backgroundColor: colors.primary },
  name: { color: colors.text, fontSize: 21, lineHeight: 26, fontFamily: fonts.display },
  stack: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
});
