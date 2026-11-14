import { StyleSheet, Text, View } from 'react-native';
import { Brick } from '@/components/editor/Brick';
import type { IconName } from '@/components/ui';
import { colors, triggerColor } from '@/theme';

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

const STACK: { label: string; color: string; icon: IconName; width: number }[] = [
  { label: '탭핑', color: triggerColor.tap, icon: 'hand-left', width: 92 },
  { label: '바스락', color: triggerColor.crinkle, icon: 'bag-handle', width: 104 },
  { label: '귓속말', color: triggerColor.whisper, icon: 'chatbubble-ellipses', width: 98 },
];

/** 홈 첫 화면: 트리거 블록 3개가 딸깍 이어진 모습 (블록을 쌓는다는 걸 바로 보여줌) */
export function BrickStack() {
  return (
    <View style={styles.stack} accessibilityLabel="탭핑, 바스락, 귓속말 블록을 이어 붙인 모습">
      {STACK.map((b) => (
        <Brick key={b.label} color={b.color} width={b.width} height={34} icon={b.icon} title={b.label} labelMinWidth={60} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 22, height: 16, borderRadius: 4, backgroundColor: colors.primary, borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.3)' },
  logoStud: { position: 'absolute', right: -4, width: 4, height: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2, backgroundColor: colors.primaryText },
  name: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  stack: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
});
