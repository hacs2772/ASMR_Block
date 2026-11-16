import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { IconName } from '@/components/ui';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/**
 * 홈 광고 자리. 지금은 우리 서비스 안내(자체 광고)를 보여주고,
 * 출시 빌드(EAS)에서 광고 SDK(AdMob 등) 배너로 바꿔 끼움.
 */
/** title·body = 사전 키 (ads.*) */
const HOUSE_ADS: { icon: IconName; title: string; body: string; href: Href; color: string }[] = [
  { icon: 'mic', title: 'ads.sellTitle', body: 'ads.sellBody', href: '/upload', color: colors.primary },
  { icon: 'gift', title: 'ads.freeTitle', body: 'ads.freeBody', href: '/explore', color: colors.success },
];

export function AdSlot({ index = 0 }: { index?: number }) {
  const { t } = useTranslation();
  const ad = HOUSE_ADS[index % HOUSE_ADS.length];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('ads.a11y', { title: t(ad.title) })} onPress={() => router.push(ad.href)}
      style={({ pressed }) => [styles.ad, { borderColor: ad.color + '55' }, pressed && { opacity: 0.85 }]} testID={`ad-${index}`}>
      <View style={[styles.icon, { backgroundColor: ad.color + '26' }]}>
        <Ionicons name={ad.icon} size={20} color={ad.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{t(ad.title)}</Text>
        <Text style={styles.body} numberOfLines={1}>{t(ad.body)}</Text>
      </View>
      <Text style={styles.label}>{t('ads.label')}</Text>
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
  label: { position: 'absolute', top: 6, right: 8, color: colors.faint, fontSize: 9, fontWeight: '700' },
});
