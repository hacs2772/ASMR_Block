import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { coinApi } from '@/api/endpoints';
import { colors, plate, radius, space, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 내 정보 "내 코인": 지금 코인(받은·충전) + 충전 안내 + 코인 내역 보기 (웹 WalletCard와 같은 내용). 내역 화면 안에서는 showLink={false} */
export function WalletCard({ showLink = true }: { showLink?: boolean }) {
  const { t } = useTranslation();
  const wallet = useQuery({ queryKey: ['wallet'], queryFn: coinApi.wallet });
  const w = wallet.data;
  return (
    <View style={styles.card} testID="wallet">
      <View style={styles.row}>
        <Ionicons name="wallet" size={20} color={colors.primaryText} />
        <Text style={styles.title}>{t('coin.title')}</Text>
        <Text style={styles.balance} testID="wallet-balance">{w ? t('common.coins', { count: w.balance }) : '…'}</Text>
      </View>
      {w ? <Text style={styles.split}>{t('coin.split', { bonus: w.bonus, paid: w.paid })}</Text> : null}
      <Text style={styles.note}>{t('coin.chargeSoon')}</Text>
      {showLink ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/coins')} style={styles.link} testID="open-coins">
          <Text style={styles.linkText}>{t('coin.history')}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...plate, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, color: colors.text, fontSize: 18, fontFamily: fonts.display },
  balance: { color: colors.text, fontSize: 20, fontFamily: fonts.display },
  split: { color: colors.faint, fontSize: 12, textAlign: 'right' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, paddingTop: 2 },
  linkText: { color: colors.primaryText, fontSize: 13, fontWeight: '700' },
});
