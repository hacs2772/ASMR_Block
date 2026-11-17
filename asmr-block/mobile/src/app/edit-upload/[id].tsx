import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { sellerApi } from '@/api/endpoints';
import type { MyUpload, TalkType, UploadEditRequest } from '@/api/types';
import { BlockLoader } from '@/components/BlockLoader';
import { Button, Chip, EmptyState } from '@/components/ui';
import { EnglishFields, type EnglishText } from '@/components/upload/EnglishFields';
import { notify } from '@/lib/dialog';
import { talkLabel } from '@/lib/labels';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

const TALKS: TalkType[] = ['NONE', 'WHISPER', 'TALK'];
const PRICE_STEPS = [0, 10, 20, 30, 50, 100];

/**
 * 내가 올린 블록 고치기 (웹 EditUpload와 같은 칸): 이름·한 줄 소개·녹음한 곳·말소리·가격 + 영어 칸 + 상점에 보이기.
 * 돌려보낸 블록은 저장하면 다시 검수를 받아요
 */
export default function EditUploadScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mine = useQuery({ queryKey: ['my-uploads'], queryFn: sellerApi.mine });
  const upload = mine.data?.content.find((u) => String(u.id) === id);
  if (mine.isLoading) return <View style={styles.screen}><BlockLoader style={{ marginTop: 60 }} /></View>;
  if (!upload) return <View style={styles.screen}><EmptyState icon="cube-outline" title={t('upload.editMissing')} /></View>;
  return <EditForm upload={upload} key={upload.id} />;
}

function EditForm({ upload }: { upload: MyUpload }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const policy = useQuery({ queryKey: ['upload-policy'], queryFn: sellerApi.policy, staleTime: 10 * 60_000 });
  const maxPrice = policy.data?.maxPrice ?? 100;
  const [title, setTitle] = useState(upload.title);
  const [note, setNote] = useState(upload.description ?? '');
  const [place, setPlace] = useState(upload.recordedPlace ?? '');
  const [talkType, setTalkType] = useState<TalkType>(upload.talkType);
  const [price, setPrice] = useState(upload.price);
  const [listed, setListed] = useState(upload.listed);
  const [english, setEnglish] = useState<EnglishText>({
    titleEn: upload.titleEn ?? '', recordedPlaceEn: upload.recordedPlaceEn ?? '', descriptionEn: upload.descriptionEn ?? '',
  });
  const rejected = upload.status === 'REJECTED';
  const prices = [...new Set([...PRICE_STEPS.filter((p) => p <= maxPrice), price])].sort((a, b) => a - b);

  const save = useMutation({
    mutationFn: () => {
      const body: UploadEditRequest = {
        title: title.trim(), description: note, recordedPlace: place, talkType, price, ...english,
        ...(upload.status === 'APPROVED' ? { listed } : {}),
      };
      return sellerApi.update(upload.id, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-uploads'] });
      void queryClient.invalidateQueries({ queryKey: ['blocks'] });
      notify(rejected ? t('upload.resubmitted') : t('upload.saved'));
      router.back();
    },
    onError: (e) => notify(t('upload.saveFailed'), (e as Error).message),
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {rejected ? <Text style={styles.warn}>{t('upload.editRejectedHint')}</Text> : null}
      <Text style={styles.label}>{t('upload.name')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100} accessibilityLabel={t('upload.name')} testID="edit-title" />
      <Text style={styles.label}>{t('upload.place')}</Text>
      <TextInput style={styles.input} value={place} onChangeText={setPlace} maxLength={60} placeholder={t('upload.placePh')}
        placeholderTextColor={colors.faint} accessibilityLabel={t('upload.place')} />
      <Text style={styles.label}>{t('upload.note')}</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} maxLength={80} placeholder={t('upload.notePh')}
        placeholderTextColor={colors.faint} accessibilityLabel={t('upload.note')} />

      <Text style={styles.label}>{t('upload.talk')}</Text>
      <View style={styles.chips}>
        {TALKS.map((k) => <Chip key={k} label={talkLabel(k)} small active={talkType === k} onPress={() => setTalkType(k)} />)}
      </View>
      <Text style={styles.label}>{t('upload.price')}</Text>
      <View style={styles.chips}>
        {prices.map((p) => (
          <Chip key={p} label={p === 0 ? t('common.free') : t('common.coins', { count: p })} small active={price === p}
            onPress={() => setPrice(p)} testID={`edit-price-${p}`} />
        ))}
      </View>

      <EnglishFields value={english} onChange={setEnglish} initiallyOpen={!!(upload.titleEn || upload.descriptionEn || upload.recordedPlaceEn)} />

      {upload.status === 'APPROVED' ? (
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>{t('upload.listed')}</Text>
            <Text style={styles.hint}>{t('upload.listedHint')}</Text>
          </View>
          <Switch value={listed} onValueChange={setListed} trackColor={{ true: colors.primary, false: colors.border }} testID="edit-listed" />
        </View>
      ) : null}

      <Button title={rejected ? t('upload.editResubmit') : t('upload.editSave')} icon="checkmark" loading={save.isPending}
        disabled={!title.trim()} onPress={() => save.mutate()} style={{ marginTop: space.md }} testID="edit-save" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl, gap: space.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: space.sm },
  input: { color: colors.text, fontSize: 15, padding: space.md, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  warn: { color: colors.warn, fontSize: 13, lineHeight: 19, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  switchTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
