import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { catalogApi, libraryApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { Button, Chip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

const FIRST_PICKS = ['tap', 'crinkle', 'whisper'];
const TARGET_SECONDS = 15 * 60;

/** 트리거마다 대표 블록 1개: 바로 시작할 수 있게 무료 먼저, 그다음 많이 들은 순 */
function topOf(blocks: Block[], code: string) {
  return blocks
    .filter((b) => b.category?.groupCode === code)
    .sort((a, b) => Number(a.price > 0) - Number(b.price > 0) || b.playCount - a.playCount)[0];
}

/** 고른 대표 블록을 돌아가며 이어 붙여 15분 안팎의 첫 조합 */
export function starterSequence(picks: Block[]) {
  const seq: Block[] = [];
  let total = 0;
  for (let i = 0; picks.length > 0 && total < TARGET_SECONDS && seq.length < 8; i++) {
    const b = picks[i % picks.length];
    seq.push(b);
    total += b.duration;
  }
  return { seq, total };
}

/**
 * "어떤 소리에 팅글이 오세요?" 트리거를 고르면 첫 조합을 바로 쌓아 보여주고,
 * 누르면 무료 블록은 담고 편집기를 그 조합으로 열어 줌 (유료는 30초 미리 듣기만)
 */
export function TriggerPicker() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const all = useQuery({ queryKey: ['blocks', 'picker'], queryFn: () => catalogApi.blocks({ size: 100, sort: 'popular' }) });
  const [picked, setPicked] = useState<string[]>(FIRST_PICKS);
  const [starting, setStarting] = useState(false);

  const blocks = all.data?.content ?? [];
  const groups = (categories.data ?? []).filter((g) => g.code && blocks.some((b) => b.category?.groupCode === g.code));
  const picks = picked.map((code) => topOf(blocks, code)).filter((b): b is Block => !!b);
  const { seq, total } = starterSequence(picks);
  const hasPaid = picks.some((b) => b.price > 0 && !b.owned);

  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));
  const pickPopular = () => {
    const plays = new Map<string, number>();
    for (const b of blocks) {
      const code = b.category?.groupCode;
      if (code) plays.set(code, (plays.get(code) ?? 0) + b.playCount);
    }
    setPicked([...plays.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code]) => code));
  };

  const start = async () => {
    if (!signedIn) return router.push('/login');
    setStarting(true);
    try {
      const toCollect = picks.filter((b) => !b.owned && b.price === 0);
      await Promise.all(toCollect.map((b) => libraryApi.add(b.id)));
      if (toCollect.length) {
        queryClient.invalidateQueries({ queryKey: ['library'] });
        queryClient.invalidateQueries({ queryKey: ['blocks'] });
      }
      const usable = seq.filter((b) => b.owned || b.price === 0);
      if (usable.length === 0) return notify('바로 쓸 수 있는 블록이 없어요', '무료 트리거를 하나 더 골라 주세요.');
      router.push({ pathname: '/editor/[id]', params: { id: 'new', start: usable.map((b) => b.id).join(',') } });
    } catch (e) {
      notify('담지 못했어요', (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  if (all.isLoading || categories.isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: space.lg }} />;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.chips}>
        {groups.map((g) => (
          <Chip key={g.id} label={g.name} color={g.color} active={picked.includes(g.code!)} onPress={() => toggle(g.code!)}
            testID={`pick-${g.code}`} />
        ))}
      </View>
      <View style={styles.links}>
        <Pressable onPress={pickPopular} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>잘 모르겠어요 · 많이 듣는 걸로</Text></Pressable>
        <Pressable onPress={() => setPicked([])} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>다시 고르기</Text></Pressable>
      </View>

      <View style={styles.result} testID="pick-result">
        <Text style={styles.resultTitle}>나의 첫 팅글 조합</Text>
        {picks.length === 0 ? (
          <Text style={styles.empty}>위에서 끌리는 트리거를 하나 이상 골라 주세요.</Text>
        ) : (
          <>
            <Text style={styles.meta}>한 바퀴 {formatDuration(total)} · 블록 {seq.length}개 · 고른 트리거 {picks.length}개</Text>
            <View style={styles.chain}>
              {seq.map((b, i) => (
                <View key={i} style={[styles.brick, { flex: b.duration, backgroundColor: b.category?.color ?? categoryFallbackColor }]}>
                  <View style={[styles.stud, { top: 4, backgroundColor: b.category?.color ?? categoryFallbackColor }]} />
                  <View style={[styles.stud, { bottom: 4, backgroundColor: b.category?.color ?? categoryFallbackColor }]} />
                </View>
              ))}
            </View>
            {picks.map((b) => (
              <View key={b.id} style={styles.pickRow}>
                <Text style={styles.pickName} numberOfLines={1}>{b.title} <Text style={styles.pickBy}>@{b.uploader.nickname}</Text></Text>
                <Text style={[styles.pickPrice, b.price === 0 && { color: colors.success }]}>{b.price > 0 ? `${b.price}코인` : '무료'}</Text>
              </View>
            ))}
            <Button title={signedIn ? '이걸로 쌓기 시작' : '로그인하고 쌓기 시작'} icon="layers" onPress={start} loading={starting}
              style={{ marginTop: space.sm }} testID="pick-start" />
            {hasPaid && <Text style={styles.note}>유료 블록은 지금은 30초만 들어 볼 수 있어서, 무료 블록만으로 시작해요.</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  links: { flexDirection: 'row', gap: space.lg },
  link: { color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
  result: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: 6 },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.faint, fontSize: 12 },
  empty: { color: colors.faint, fontSize: 13, marginTop: 4 },
  chain: { flexDirection: 'row', gap: 4, height: 26, marginTop: space.sm, marginBottom: space.sm, marginRight: 4 },
  brick: { borderRadius: 5, borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.3)' },
  stud: { position: 'absolute', right: -3, width: 3, height: 6, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  pickName: { color: colors.text, fontSize: 13, flex: 1 },
  pickBy: { color: colors.faint, fontSize: 12 },
  pickPrice: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  note: { color: colors.faint, fontSize: 11, marginTop: 2 },
});
