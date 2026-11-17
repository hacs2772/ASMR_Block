import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tonightApi } from '@/api/endpoints';
import { Button, Chip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { tonightDoneMessage, tonightExamples } from '@/lib/tonight';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

/**
 * 오늘 밤 조합 (홈): "어떤 밤을 보내고 싶어요?" 한 줄 → AI(켜져 있으면)나 낱말로 트리거를 골라 두 줄 조합을 쌓고 플레이어로.
 * 한 줄 없이 "내 취향대로"도 됨. 플레이어 위에 어떻게 쌓았는지 한 줄(notice) — 웹 components/home/Tonight.jsx와 같은 흐름
 */
export function TonightCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const info = useQuery({ queryKey: ['tonight', 'info', signedIn], queryFn: tonightApi.info });
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<'prompt' | 'taste' | null>(null);
  const ai = !!info.data?.ai;
  const max = info.data?.maxPromptLength ?? 80;
  const left = info.data?.aiLeftToday;

  const make = async (withPrompt: boolean) => {
    if (busy) return;
    if (!signedIn) {
      router.push('/login');
      return;
    }
    setBusy(withPrompt ? 'prompt' : 'taste');
    try {
      const result = await tonightApi.make(withPrompt ? prompt : '', 60);
      void queryClient.invalidateQueries({ queryKey: ['playlists'] });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['tonight'] });
      router.push({
        pathname: '/player/[id]',
        params: { id: String(result.playlist.id), autoplay: '1', notice: tonightDoneMessage(result) },
      });
    } catch (e) {
      notify(t('tonight.failed'), (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card} testID="tonight">
      <View style={styles.head}>
        <Text style={styles.title}>{t('tonight.title')}</Text>
      </View>
      <Text style={styles.lead}>{ai ? t('tonight.leadAi') : t('tonight.lead')}</Text>
      <TextInput style={styles.input} value={prompt} onChangeText={setPrompt} maxLength={max}
        placeholder={t('tonight.placeholder')} placeholderTextColor={colors.faint} accessibilityLabel={t('tonight.inputLabel')}
        returnKeyType="go" onSubmitEditing={() => { if (prompt.trim()) void make(true); }} testID="tonight-input" />
      <View style={styles.examples}>
        {tonightExamples().map((ex) => (
          <Chip key={ex} label={ex} small onPress={() => setPrompt(ex.slice(0, max))} testID="tonight-example" />
        ))}
      </View>
      <Button title={busy === 'prompt' ? t('tonight.building') : t('tonight.go')} onPress={() => void make(true)}
        loading={busy === 'prompt'} disabled={!prompt.trim() || !!busy} testID="tonight-go" />
      <Button title={busy === 'taste' ? t('tonight.building') : t('tonight.taste')} icon="heart" variant="secondary"
        onPress={() => void make(false)} loading={busy === 'taste'} disabled={!!busy} testID="tonight-taste" />
      <Text style={styles.note}>
        {ai ? (left != null ? t('tonight.aiNoteLeft', { count: left }) : t('tonight.aiNote')) : t('tonight.wordsNote')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 14, paddingHorizontal: space.md, paddingVertical: 10, marginTop: 2,
  },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 },
  note: { color: colors.faint, fontSize: 11, lineHeight: 16 },
});
