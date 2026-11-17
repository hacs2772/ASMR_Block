import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { coinApi } from '@/api/endpoints';
import { ago } from '@/lib/time';
import { currentLang, localeOf } from '@/locales';
import { colors, plate, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/**
 * 블록 판매 탭 "내 판매 수익": 팔린 횟수·코인, 정산 대기(내 몫), 정산 받음, 최근 판매 (웹 EarningsCard와 같은 내용).
 * 내 몫 = 충전 코인으로 팔린 부분 × sharePercent (이벤트로 받은 코인으로 팔린 건 정산 안 됨)
 */
export function EarningsCard() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ['earnings'], queryFn: coinApi.earnings });
  const e = query.data;
  if (!e) return null;
  const num = (n: number) => n.toLocaleString(localeOf());
  return (
    <View style={styles.card} testID="earnings">
      <View style={styles.head}>
        <Text style={styles.title}>{t('earn.title')}</Text>
      </View>
      <View style={styles.grid}>
        <Stat label={t('earn.sales')} value={num(e.salesCount)} />
        <Stat label={t('earn.sold')} value={t('common.coins', { count: e.soldCoins })} />
        <Stat label={t('earn.pending')} value={t('common.coins', { count: e.pendingCoins })} sub={t('earn.krw', { krw: num(e.pendingKrw) })} strong testID="earn-pending" />
        <Stat label={t('earn.settled')} value={t('common.coins', { count: e.settledCoins })} />
      </View>
      <Text style={styles.rule}>{t('earn.rule', { percent: e.sharePercent })}</Text>
      {e.recent.length === 0 ? <Text style={styles.empty}>{t('earn.empty')}</Text> : (
        <View>
          <Text style={styles.sub}>{t('earn.recent')}</Text>
          {e.recent.slice(0, 5).map((s, i) => (
            <View key={`${s.blockId}-${s.at}-${i}`} style={styles.sale}>
              <Text style={styles.saleTitle} numberOfLines={1}>{s.title}</Text>
              <Text style={styles.saleAt}>{ago(s.at, undefined, currentLang())}</Text>
              <Text style={styles.saleShare}>{s.share > 0 ? t('earn.share', { count: s.share }) : t('earn.bonusOnly')}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, sub, strong, testID }: { label: string; value: string; sub?: string; strong?: boolean; testID?: string }) {
  return (
    <View style={[styles.stat, strong && styles.statStrong]}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} testID={testID}>{value}</Text>
      {sub ? <Text style={styles.statLabel} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...plate, padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 8 },
  statStrong: { backgroundColor: colors.primarySoft },
  statLabel: { color: colors.muted, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  rule: { color: colors.faint, fontSize: 11, lineHeight: 16 },
  empty: { color: colors.muted, fontSize: 13 },
  sub: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  sale: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  saleTitle: { flex: 1, color: colors.text, fontSize: 13 },
  saleAt: { color: colors.faint, fontSize: 11 },
  saleShare: { color: colors.text, fontSize: 12, fontWeight: '700' },
});
