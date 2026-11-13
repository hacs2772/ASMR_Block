import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '@/components/ui';
import { colors, radius, space } from '@/theme';

/**
 * 홈 광고 자리. 지금은 우리 서비스 안내(자체 광고)를 보여주고,
 * 출시 빌드(EAS)에서 광고 SDK(AdMob 등) 배너로 바꿔 끼움.
 */
const HOUSE_ADS: { icon: IconName; title: string; body: string; href: Href; color: string }[] = [
  { icon: 'mic', title: '내가 녹음한 ASMR을 팔아보세요', body: '희귀하고 특이한 소리일수록 많이 찾아요', href: '/upload', color: '#EC4899' },
  { icon: 'gift', title: '무료 블록 담고 바로 만들어보기', body: '빗소리·파도·노이즈 무료 블록', href: '/explore', color: '#22C55E' },
];

export function AdSlot({ index = 0 }: { index?: number }) {
  const ad = HOUSE_ADS[index % HOUSE_ADS.length];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`광고: ${ad.title}`} onPress={() => router.push(ad.href)}
      style={({ pressed }) => [styles.ad, { borderColor: ad.color + '55' }, pressed && { opacity: 0.85 }]} testID={`ad-${index}`}>
      <View style={[styles.icon, { backgroundColor: ad.color + '26' }]}>
        <Ionicons name={ad.icon} size={20} color={ad.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{ad.title}</Text>
        <Text style={styles.body} numberOfLines={1}>{ad.body}</Text>
      </View>
      <Text style={styles.label}>AD</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ad: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, marginVertical: space.md,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { position: 'absolute', top: 6, right: 8, color: colors.faint, fontSize: 9, fontWeight: '800' },
});
