import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sleepApi } from '@/api/endpoints';
import type { GoodCombo } from '@/api/types';
import { PlaylistCard } from '@/components/PlaylistCard';
import { goodComboLine } from '@/lib/sleepLog';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';

/**
 * 홈: 잘 잤던 날 들은 조합 (최근 30일 잘 잔 밤이 많은 순, 최대 3개) → 누르면 다시 듣기.
 * 없으면 아무것도 안 보임 (웹 components/sleep/GoodNightCombos.jsx와 같음). 쿼리 키 ['sleep', 'good-combos']
 */
export function GoodNightCombos() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const query = useQuery({ queryKey: ['sleep', 'good-combos'], queryFn: sleepApi.goodCombos, enabled: signedIn });
  const list = query.data ?? [];
  if (!signedIn || list.length === 0) return null;
  return (
    <View style={styles.section} testID="good-combos">
      <Text style={styles.title}>😴 {t('sleepLog.goodTitle')}</Text>
      <Text style={styles.lead}>{t('sleepLog.goodLead')}</Text>
      {list.map((g) => <GoodComboCard key={g.combo.id} good={g} />)}
    </View>
  );
}

/** 잘 잤던 조합 카드: 조합 카드 + 아래 "잘 잔 밤 2번 · 마지막 11월 15일 밤" (내 정보 이번 주 리포트에서도 씀) */
export function GoodComboCard({ good }: { good: GoodCombo }) {
  return (
    <View testID={`good-combo-${good.combo.id}`}>
      <PlaylistCard playlist={good.combo}
        onPress={() => router.push({ pathname: '/player/[id]', params: { id: String(good.combo.id), autoplay: '1' } })}
        footer={<Text style={styles.line} numberOfLines={2}>{keepParts(goodComboLine(good))}</Text>} />
    </View>
  );
}

/** 좁으면 " · " 앞뒤에서만 줄바꿈 ("11월 16일 / 밤"처럼 갈라지지 않게 각 부분의 띄어쓰기를 줄바꿈 안 되는 띄어쓰기로) */
const keepParts = (text: string) => text.split(' · ').map((part) => part.replace(/ /g, '\u00A0')).join(' · ');

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  lead: { color: colors.muted, fontSize: 13, marginTop: 2, marginBottom: space.md },
  line: { color: colors.muted, fontSize: 12 },
});
