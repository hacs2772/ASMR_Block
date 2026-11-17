import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sleepApi } from '@/api/endpoints';
import { Chip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { categoryName } from '@/lib/labels';
import type { SleepReport } from '@/api/types';
import { GoodComboCard } from '@/components/sleep/GoodNightCombos';
import { compareOf, listenedLabel, listenedShort, nightLabel, RATINGS, ratingOf, weekdayOf } from '@/lib/sleepLog';
import { colors, radius, space } from '@/theme';

/**
 * 내 정보: 최근 7일 잠 기록 — 위 = 이번 주 리포트(잘 잔 밤·틀어 본 밤·들은 시간 + 지난주와 비교),
 * 밤마다 답(😴😐😣)·틀었는지(누르면 그 밤을 기록하거나 바꿈), 이번 주 가장 잘 잔 조합(다시 듣기),
 * 아래 한 줄 = 잘 잔 밤에 많이 들은 소리 (웹 components/sleep/SleepWeek.jsx와 같음)
 */
export function SleepWeek() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const week = useQuery({ queryKey: ['sleep', 'week'], queryFn: sleepApi.week });
  const [open, setOpen] = useState<string | null>(null);
  const data = week.data;

  const rate = async (night: string, rating: number) => {
    try {
      await sleepApi.rate(night, rating);
      setOpen(null);
      void queryClient.invalidateQueries({ queryKey: ['sleep'] });
    } catch (e) {
      notify(t('sleepLog.failed'), (e as Error).message);
    }
  };

  if (!data) return null;
  const selected = data.nights.find((n) => n.night === open);
  const anything = data.nights.some((n) => n.rating != null || n.combos.length > 0);
  return (
    <View style={styles.card} testID="sleep-week">
      <View style={styles.head}>
        <Text style={styles.title}>{t('sleepLog.weekTitle')}</Text>
      </View>
      {anything && data.report ? <Report report={data.report} /> : null}
      <View style={styles.days}>
        {data.nights.map((n) => {
          const r = ratingOf(n.rating);
          const on = open === n.night;
          return (
            <Pressable key={n.night} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${nightLabel(n.night)} · ${r ? t(`sleepLog.${r.key}`) : t('sleepLog.noRecord')}`}
              onPress={() => setOpen(on ? null : n.night)} style={[styles.day, on && { borderColor: colors.primary }]}
              testID={`sleep-night-${n.night}`}>
              <Text style={styles.weekday}>{weekdayOf(n.night)}</Text>
              {r ? <Text style={styles.dayEmoji}>{r.emoji}</Text>
                : <View style={[styles.dot, n.combos.length > 0 && styles.dotPlayed]} />}
            </Pressable>
          );
        })}
      </View>
      {selected && (
        <View style={styles.detail} testID="sleep-night-detail">
          <Text style={styles.detailTitle}>
            {nightLabel(selected.night)}{selected.combos.length > 0 ? <Text style={styles.muted}> · {listenedLabel(selected.minutes)}</Text> : null}
          </Text>
          {selected.combos.length > 0 && (
            <Text style={styles.muted} numberOfLines={1}>{t('sleepLog.listenedCombos', { combos: selected.combos.map((c) => c.title).join(', ') })}</Text>
          )}
          <View style={styles.chips}>
            {RATINGS.map((r) => (
              <Chip key={r.value} small label={`${r.emoji} ${t(`sleepLog.${r.key}`)}`} active={selected.rating === r.value}
                onPress={() => void rate(selected.night, r.value)} testID={`sleep-rate-${r.key}`} />
            ))}
          </View>
        </View>
      )}
      {data.report?.best ? (
        <View testID="sleep-best">
          <Text style={styles.bestLabel}>{t('sleepLog.best')}</Text>
          <GoodComboCard good={data.report.best} />
        </View>
      ) : null}
      <Text style={styles.note}>
        {data.goodTriggers.length > 0
          ? t('sleepLog.goodWith', { triggers: data.goodTriggers.map((g) => categoryName(g.code, g.name)).join(', ') })
          : !anything ? t('sleepLog.weekEmpty') : t('sleepLog.rateThis')}
      </Text>
    </View>
  );
}

/** 이번 주 리포트: 숫자 세 칸 + 지난주와 비교한 한 줄 (지난주 기록이 없으면 비교 줄은 안 보임) */
function Report({ report }: { report: SleepReport }) {
  const { t } = useTranslation();
  const compare = compareOf(report);
  const icon = compare?.trend === 'up' ? 'trending-up' : compare?.trend === 'down' ? 'trending-down' : 'remove';
  return (
    <View style={{ gap: space.sm }} testID="sleep-report">
      <View style={styles.stats}>
        <Stat label={t('sleepLog.statGood')} value={t('sleepLog.nights', { n: report.good })} testID="report-good" />
        <Stat label={t('sleepLog.statPlayed')} value={t('sleepLog.nights', { n: report.playedNights })} testID="report-played" />
        <Stat label={t('sleepLog.statListened')} value={listenedShort(report.minutes)} testID="report-listened" />
      </View>
      {compare ? (
        <View style={styles.compare} testID="report-compare">
          <Ionicons name={icon} size={14} color={compare.trend === 'up' ? colors.primaryText : colors.muted} />
          <Text style={[styles.muted, { flex: 1 }]}>{compare.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} testID={testID}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: space.sm, paddingVertical: 8 },
  statLabel: { color: colors.muted, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  compare: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bestLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  weekday: { color: colors.faint, fontSize: 11 },
  dayEmoji: { fontSize: 17, height: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong, marginVertical: 8 },
  dotPlayed: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginVertical: 7 },
  detail: { backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: 6 },
  detailTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12, fontWeight: '400' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
