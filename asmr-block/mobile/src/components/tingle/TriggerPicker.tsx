import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlockLoader } from '@/components/BlockLoader';
import { catalogApi, libraryApi, playlistApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { Button, Chip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, plate, space, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';
import { categoryLabel } from '@/lib/labels';

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
  const { t, i18n } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const all = useQuery({ queryKey: ['blocks', 'picker'], queryFn: () => catalogApi.blocks({ size: 100, sort: 'popular' }) });
  const [picked, setPicked] = useState<string[]>(FIRST_PICKS);
  const [starting, setStarting] = useState(false);
  const [listening, setListening] = useState(false);

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
      if (usable.length === 0) return notify(t('trigger.noUsable'), t('trigger.noUsableBody'));
      router.push({ pathname: '/editor/[id]', params: { id: 'new', start: usable.map((b) => b.id).join(',') } });
    } catch (e) {
      notify(t('trigger.addFailed'), (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  /** 바로 듣기: 서버가 무료 블록을 담고 조합을 쌓아 완성본까지 시작 → 플레이어가 다 되면 재생 */
  const listenNow = async () => {
    if (!signedIn) return router.push('/login');
    setListening(true);
    try {
      // 영어 화면이면 조합 이름도 영어로 (한국어는 서버가 정한 이름 그대로)
      const names = picked.map((code) => categoryLabel(groups.find((g) => g.code === code))).filter(Boolean).join(' · ');
      const title = i18n.language === 'en' ? t('trigger.comboTitle', { names }).slice(0, 100) : undefined;
      const combo = await playlistApi.quickStart(picked, 60, title);
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      router.push({ pathname: '/player/[id]', params: { id: String(combo.id) } });
    } catch (e) {
      notify(t('trigger.buildFailed'), (e as Error).message);
    } finally {
      setListening(false);
    }
    return undefined;
  };

  if (all.isLoading || categories.isLoading) return <BlockLoader size="small" style={{ marginVertical: space.lg }} />;

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.chips}>
        {groups.map((g) => (
          <Chip key={g.id} label={categoryLabel(g)} color={g.color} active={picked.includes(g.code!)} onPress={() => toggle(g.code!)}
            testID={`pick-${g.code}`} />
        ))}
      </View>
      <View style={styles.links}>
        <Pressable onPress={pickPopular} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>{t('trigger.popular')}</Text></Pressable>
        <Pressable onPress={() => setPicked([])} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>{t('trigger.reset')}</Text></Pressable>
      </View>

      <View style={styles.result} testID="pick-result">
        <Text style={styles.resultTitle}>{t('trigger.resultTitle')}</Text>
        {picks.length === 0 ? (
          <Text style={styles.empty}>{t('trigger.empty')}</Text>
        ) : (
          <>
            <Text style={styles.meta}>{t('trigger.meta', { length: formatDuration(total), blocks: t('combo.blocks', { count: seq.length }), triggers: t('trigger.pickedN', { count: picks.length }) })}</Text>
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
                <Text style={[styles.pickPrice, b.price === 0 && { color: colors.success }]}>{b.price > 0 ? t('common.coins', { count: b.price }) : t('common.free')}</Text>
              </View>
            ))}
            <Button title={signedIn ? t('trigger.listenNow') : t('trigger.loginListen')} icon="play" onPress={() => void listenNow()}
              loading={listening} style={{ marginTop: space.sm }} testID="pick-listen" />
            <Button title={t('trigger.buildSelf')} icon="layers" variant="secondary" onPress={start} loading={starting} testID="pick-start" />
            {hasPaid && <Text style={styles.note}>{t('trigger.paidNote')}</Text>}
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
  result: { ...plate, padding: space.lg, gap: 6 },
  resultTitle: { color: colors.text, fontSize: 18, fontFamily: fonts.display },
  meta: { color: colors.faint, fontSize: 12 },
  empty: { color: colors.faint, fontSize: 13, marginTop: 4 },
  chain: { flexDirection: 'row', gap: 4, height: 26, marginTop: space.sm, marginBottom: space.sm, marginRight: 4 },
  brick: { borderRadius: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.45)', borderBottomWidth: 3 },
  stud: { position: 'absolute', right: -4, width: 3, height: 6, borderTopRightRadius: 1, borderBottomRightRadius: 1 },
  pickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  pickName: { color: colors.text, fontSize: 13, flex: 1 },
  pickBy: { color: colors.faint, fontSize: 12 },
  pickPrice: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  note: { color: colors.faint, fontSize: 11, marginTop: 2 },
});
