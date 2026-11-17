import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sellerApi } from '@/api/endpoints';
import type { CreatorMyStats } from '@/api/types';
import { barsOf, dayLabel, ticksOf, tipOf, type StatsMetric } from '@/lib/creatorStats';
import { localeOf } from '@/locales';
import { colors, radius, space } from '@/theme';

/**
 * 블록 판매 탭 "내 블록 통계" (웹 components/sell/CreatorStats.jsx와 같은 내용).
 * 숫자 네 칸(담은 사람 · 쓰인 조합 · 14일 새로 담김 · 14일 들음) + 최근 14일 막대그래프.
 * 막대는 한 번에 하나만 (담김과 들음은 크기가 달라 한 축에 같이 그리지 않음) → 아래 두 칸을 눌러 바꿈.
 * 쿼리 키가 ['my-uploads', …]라 새로 올리거나 고치면 같이 새로 받음
 */
export function CreatorStats() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: ['my-uploads', 'stats'], queryFn: sellerApi.stats });
  const [metric, setMetric] = useState<StatsMetric>('collects');
  const s = query.data;
  if (!s) return null;
  const num = (n: number) => n.toLocaleString(localeOf());
  const total = metric === 'plays' ? s.plays14d : s.collects14d;
  return (
    <View style={styles.card} testID="creator-stats">
      <View style={styles.head}>
        <Ionicons name="stats-chart" size={17} color={colors.primaryText} />
        <Text style={styles.title}>{t('cstats.title')}</Text>
      </View>
      <Text style={styles.listed} testID="cstats-listed">{t('cstats.listed', { listed: num(s.listedBlocks), pending: num(s.pendingBlocks) })}</Text>
      <View style={styles.grid}>
        <Tile label={t('cstats.collectors')} value={t('cstats.people', { n: num(s.collectors) })} testID="cstats-collectors" />
        <Tile label={t('cstats.combos')} value={t('cstats.count', { n: num(s.usedInCombos) })} testID="cstats-combos" />
        <Tile label={t('cstats.collects')} value={t('cstats.people', { n: num(s.collects14d) })}
          active={metric === 'collects'} onPress={() => setMetric('collects')} testID="cstats-collects" />
        <Tile label={t('cstats.plays')} value={t('cstats.times', { n: num(s.plays14d) })}
          active={metric === 'plays'} onPress={() => setMetric('plays')} testID="cstats-plays" />
      </View>
      <Text style={styles.chartTitle} testID="cstats-chart-title">{t(metric === 'plays' ? 'cstats.chartPlays' : 'cstats.chartCollects')}</Text>
      {total === 0 ? <Text style={styles.empty} testID="cstats-empty">{t('cstats.empty')}</Text>
        : <Chart key={metric} days={s.days} metric={metric} />}
      <Text style={styles.note}>{t('cstats.note')}</Text>
    </View>
  );
}

function Tile({ label, value, active, onPress, testID }: {
  label: string; value: string; active?: boolean; onPress?: () => void; testID: string;
}) {
  const body = (
    <>
      <View style={styles.tileLabelRow}>
        {onPress ? <Ionicons name="bar-chart" size={10} color={active ? colors.primaryText : colors.muted} /> : null}
        <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1} testID={testID}>{value}</Text>
    </>
  );
  if (!onPress) return <View style={styles.tile}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress}
      style={[styles.tile, active && styles.tileOn]} testID={`${testID}-tile`}>
      {body}
    </Pressable>
  );
}

/** 최근 14일 막대: 가장 큰 날에만 숫자, 막대를 누르면 그날 숫자가 위에 (다시 누르면 지움) */
function Chart({ days, metric }: { days: CreatorMyStats['days']; metric: StatsMetric }) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const b = barsOf(days, metric);
  const n = days.length;
  return (
    <View>
      <Text style={styles.readout} numberOfLines={1} testID="cstats-tip">
        {picked !== null && days[picked] ? tipOf(days[picked].date, metric, b.values[picked]) : ' '}
      </Text>
      <View style={styles.plot} testID="cstats-chart">
        {days.map((d, i) => {
          const h = b.heights[i];
          const dim = picked !== null && picked !== i;
          return (
            <Pressable key={d.date} style={styles.column} onPress={() => setPicked(picked === i ? null : i)}
              accessibilityRole="button" accessibilityLabel={tipOf(d.date, metric, b.values[i])} testID={`cstats-bar-${i}`}>
              {h > 0 ? <View style={[styles.bar, { height: `${h * 100}%` }, dim && { opacity: 0.45 }]} /> : null}
              {picked === null && i === b.maxIndex ? (
                <View pointerEvents="none" style={[styles.maxWrap, { bottom: `${h * 100}%` }]}>
                  <Text style={styles.maxLabel}>{b.values[i].toLocaleString(localeOf())}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ticks}>
        {ticksOf(n).map((i) => (
          <View key={i} style={[styles.tick, i === 0 ? { left: 0, alignItems: 'flex-start' }
            : i === n - 1 ? { right: 0, alignItems: 'flex-end' }
              : { left: `${((i + 0.5) / n) * 100}%`, marginLeft: -40, alignItems: 'center' }]}>
            <Text style={styles.tickLabel} numberOfLines={1}>{i === n - 1 ? t('cstats.today') : dayLabel(days[i].date)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  listed: { color: colors.muted, fontSize: 12, marginTop: -4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent' },
  tileOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  tileLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tileLabel: { color: colors.muted, fontSize: 11, flexShrink: 1 },
  tileValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  chartTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 4 },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 19, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md },
  readout: { color: colors.text, fontSize: 12, fontWeight: '700', minHeight: 16 },
  plot: {
    height: 104, paddingTop: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', maxWidth: 24, backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  maxWrap: { position: 'absolute', left: -20, right: -20, alignItems: 'center', marginBottom: 2 },
  maxLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  ticks: { height: 16, marginTop: 4 },
  tick: { position: 'absolute', top: 0, width: 80 },
  tickLabel: { color: colors.muted, fontSize: 11 },
  note: { color: colors.faint, fontSize: 11, lineHeight: 16 },
});
