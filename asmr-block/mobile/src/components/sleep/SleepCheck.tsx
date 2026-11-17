import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { sleepApi } from '@/api/endpoints';
import { notify } from '@/lib/dialog';
import { listenedLabel, nightLabel, RATINGS, thanksOf } from '@/lib/sleepLog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

/**
 * 홈 맨 위, 아침 한 번: "어젯밤 잘 잤어요?" (어젯밤 조합을 틀었고 아직 답하지 않았으면, 새벽 4시부터 — 서버가 정함).
 * 답하면 잘 잔 밤의 소리를 취향·오늘 밤 조합에 반영, ✕ = 건너뛰기 (웹 components/sleep/SleepCheck.jsx와 같음)
 */
export function SleepCheck() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const pending = useQuery({ queryKey: ['sleep', 'pending'], queryFn: sleepApi.pending, enabled: signedIn });
  const [answered, setAnswered] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const p = pending.data;

  const answer = async (rating: number) => {
    if (!p || busy) return;
    setBusy(true);
    try {
      await sleepApi.rate(p.night, rating);
      if (rating === 0) queryClient.setQueryData(['sleep', 'pending'], null);
      else setAnswered(rating);
      // 최근 7일·이번 주 리포트·홈 "잘 잤던 날 들은 조합"을 새로 받음 (물어보는 카드는 아래에서 직접 바꿈)
      void queryClient.invalidateQueries({ queryKey: ['sleep', 'week'] });
      void queryClient.invalidateQueries({ queryKey: ['sleep', 'good-combos'] });
      void queryClient.invalidateQueries({ queryKey: ['blocks', 'forYou'] });
    } catch (e) {
      notify(t('sleepLog.failed'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!signedIn || !p) return null;
  if (answered !== null) {
    return (
      <View style={styles.card} testID="sleep-thanks">
        <Text style={styles.thanks}>{RATINGS.find((r) => r.value === answered)?.emoji} {thanksOf(answered)}</Text>
      </View>
    );
  }
  const longest = Math.max(0, ...p.combos.map((c) => c.minutes));
  return (
    <View style={styles.card} testID="sleep-check">
      <View style={styles.head}>
        <Text style={styles.title}>{t('sleepLog.askTitle')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sleepLog.skip')} onPress={() => void answer(0)} hitSlop={10}
          style={styles.skip} testID="sleep-skip">
          <Ionicons name="close" size={18} color={colors.faint} />
        </Pressable>
      </View>
      <Text style={styles.meta} numberOfLines={2}>
        {nightLabel(p.night)} · {listenedLabel(longest)} · {t('sleepLog.listenedCombos', { combos: p.combos.map((c) => c.title).join(', ') })}
      </Text>
      <View style={styles.row}>
        {RATINGS.map((r) => (
          <Pressable key={r.value} accessibilityRole="button" onPress={() => void answer(r.value)} disabled={busy}
            style={({ pressed }) => [styles.choice, pressed && { borderColor: colors.primary }]} testID={`sleep-${r.key}`}>
            <Text style={styles.emoji}>{r.emoji}</Text>
            <Text style={styles.choiceText} numberOfLines={1}>{t(`sleepLog.${r.key}`)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, padding: space.lg, gap: space.sm, marginBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800' },
  skip: { padding: 2 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: space.sm, marginTop: 4 },
  choice: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg },
  emoji: { fontSize: 24 },
  choiceText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  thanks: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
});
