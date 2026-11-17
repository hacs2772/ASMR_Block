import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { coinApi } from '@/api/endpoints';
import type { CoinTransaction } from '@/api/types';
import { BlockLoader } from '@/components/BlockLoader';
import { WalletCard } from '@/components/coin/WalletCard';
import { signed, txKey } from '@/lib/coins';
import { ago } from '@/lib/time';
import { currentLang } from '@/locales';
import { colors, space, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 내 코인 + 코인 내역 (최근 50개) */
export default function CoinsScreen() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ['wallet', 'transactions'], queryFn: () => coinApi.transactions() });
  const label = (x: CoinTransaction) => {
    const k = txKey(x);
    return t(k.key, { title: k.title, defaultValue: x.type });
  };
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={list.data?.content ?? []}
      keyExtractor={(x) => String(x.id)}
      refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <WalletCard showLink={false} />
          <Text style={styles.section}>{t('coin.history')}</Text>
          {list.isLoading ? <BlockLoader size="small" /> : null}
          {!list.isLoading && (list.data?.content ?? []).length === 0 ? <Text style={styles.empty}>{t('coin.historyEmpty')}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row} testID={`coin-tx-${item.type}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label} numberOfLines={1}>{label(item)}</Text>
            <Text style={styles.meta} numberOfLines={1}>{[item.note, ago(item.at, undefined, currentLang())].filter(Boolean).join(' · ')}</Text>
          </View>
          <Text style={[styles.amount, item.amount > 0 && { color: colors.success }]}>{signed(item.amount)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: 2 },
  section: { color: colors.text, fontSize: 18, marginTop: space.sm, fontFamily: fonts.display },
  empty: { color: colors.faint, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.faint, fontSize: 12, marginTop: 2 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '800' },
});
