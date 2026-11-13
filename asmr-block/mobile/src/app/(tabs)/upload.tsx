import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { catalogApi, sellerApi } from '@/api/endpoints';
import type { MyUpload } from '@/api/types';
import { Button, Chip, EmptyState } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

const PRICE_STEPS = [10, 20, 30, 50, 100];

type PickedFile = DocumentPicker.DocumentPickerAsset;

/**
 * ASMR 업로드 (판매자): 휴대폰의 녹음 파일 → 제목·분류·가격 → 올리기 → 관리자 검수 후 상점에 나옴.
 * 아래에서 내가 올린 블록의 검수 상태와 담은 사람 수를 봄.
 */
export default function UploadScreen() {
  const status = useAuth((s) => s.status);
  const queryClient = useQueryClient();
  const policy = useQuery({ queryKey: ['upload-policy'], queryFn: sellerApi.policy, staleTime: 10 * 60_000 });
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const mine = useQuery({ queryKey: ['my-uploads'], queryFn: sellerApi.mine, enabled: status === 'signedIn' });

  const [file, setFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [price, setPrice] = useState(0);
  const [ownRecording, setOwnRecording] = useState(false);

  const maxPrice = policy.data?.maxPrice ?? 100;
  const maxFileMb = policy.data?.maxFileMb ?? 50;
  const group = categories.data?.find((g) => g.id === groupId);

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const picked = result.assets[0];
    if (picked.size && picked.size > maxFileMb * 1024 * 1024) {
      notify('파일이 너무 커요', `${maxFileMb}MB 이하 파일만 올릴 수 있어요.`);
      return;
    }
    setFile(picked);
    if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, '').slice(0, 100));
  };

  const reset = () => {
    setFile(null);
    setTitle('');
    setGroupId(null);
    setCategoryId(null);
    setPrice(0);
    setOwnRecording(false);
  };

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (Platform.OS === 'web' && file?.file) form.append('file', file.file);
      else form.append('file', { uri: file!.uri, name: file!.name, type: file!.mimeType ?? 'audio/mpeg' } as unknown as Blob);
      form.append('title', title.trim());
      form.append('categoryId', String(categoryId));
      form.append('license', 'OWN');
      form.append('price', String(price));
      return sellerApi.upload(form);
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['my-uploads'] });
      notify('올렸어요!', '검수가 끝나면 상점에 나와요. 아래 "내가 올린 블록"에서 상태를 볼 수 있어요.');
    },
    onError: (e) => notify('올리지 못했어요', (e as Error).message),
  });

  const missing = !file ? '소리 파일을 골라주세요' : !title.trim() ? '제목을 적어주세요' : !categoryId ? '분류를 골라주세요'
    : !ownRecording ? '직접 녹음한 소리인지 확인해주세요' : null;

  if (status !== 'signedIn') {
    return (
      <View style={styles.screen}>
        <EmptyState icon="cloud-upload-outline" title="로그인하면 내가 녹음한 ASMR을 팔 수 있어요"
          message="희귀하고 특이한 소리일수록 많이 찾아요. 검수 후 블록 상점에 올라가요.">
          <Button title="로그인" onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
        </EmptyState>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={mine.isRefetching} onRefresh={() => void mine.refetch()} tintColor={colors.muted} />}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>새 블록 올리기</Text>

        <Text style={styles.label}>소리 파일</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="소리 파일 고르기" onPress={pick} style={styles.fileBox} testID="pick-file">
          <Ionicons name={file ? 'musical-note' : 'folder-open-outline'} size={20} color={file ? colors.primary : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>{file ? file.name : '휴대폰에서 파일 고르기'}</Text>
            <Text style={styles.fileMeta}>
              {file?.size ? `${(file.size / 1024 / 1024).toFixed(1)}MB · ` : ''}
              {policy.data ? `${policy.data.extensions.join(', ')} · ${Math.round(policy.data.minSeconds)}초~${policy.data.maxSeconds / 60}분 · ${maxFileMb}MB까지` : ' '}
            </Text>
          </View>
        </Pressable>

        <Text style={styles.label}>제목</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100}
          placeholder="예: 비 오는 교토 골목" placeholderTextColor={colors.faint} accessibilityLabel="제목" testID="upload-title" />

        <Text style={styles.label}>분류</Text>
        <View style={styles.chips}>
          {(categories.data ?? []).map((g) => (
            <Chip key={g.id} label={g.name} color={g.color} active={groupId === g.id} onPress={() => { setGroupId(g.id); setCategoryId(null); }} />
          ))}
        </View>
        {group && (
          <View style={[styles.chips, { marginTop: space.sm }]}>
            {group.children.map((c) => (
              <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        )}

        <Text style={styles.label}>가격 <Text style={styles.labelHint}>· 최대 {maxPrice}코인</Text></Text>
        <View style={styles.chips}>
          <Chip label="무료" active={price === 0} onPress={() => setPrice(0)} />
          {PRICE_STEPS.filter((p) => p <= maxPrice).map((p) => (
            <Chip key={p} label={`🪙 ${p}`} active={price === p} onPress={() => setPrice(p)} />
          ))}
        </View>
        <Text style={styles.hint}>많이 찾는 희귀·트렌드 소리일수록 가격을 높일 수 있어요. 유료 블록은 사기 전 앞 30초만 들려줘요.</Text>

        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ownRecording }} onPress={() => setOwnRecording(!ownRecording)}
          style={styles.check} testID="own-recording">
          <Ionicons name={ownRecording ? 'checkbox' : 'square-outline'} size={22} color={ownRecording ? colors.primary : colors.muted} />
          <Text style={styles.checkText}>제가 직접 녹음한 소리예요 (다른 사람의 저작물이 아니에요)</Text>
        </Pressable>

        <Button title={missing ?? '올리기'} icon="cloud-upload-outline" onPress={() => upload.mutate()}
          disabled={!!missing} loading={upload.isPending} testID="upload-submit" />
        <Text style={styles.hint}>올리면 음량을 자동으로 맞추고, 관리자 검수 후 블록 상점에 나와요.</Text>
      </View>

      <Text style={styles.sectionTitle}>내가 올린 블록</Text>
      {mine.isLoading ? <ActivityIndicator color={colors.primary} />
        : (mine.data?.content ?? []).length === 0 ? <Text style={styles.empty}>아직 올린 블록이 없어요</Text>
          : mine.data!.content.map((u) => <UploadRow key={u.id} upload={u} />)}
    </ScrollView>
  );
}

const STATUS = {
  PENDING: { label: '검수 중', color: '#FCD34D' },
  APPROVED: { label: '판매 중', color: colors.success },
  REJECTED: { label: '거절됨', color: colors.danger },
} as const;

function UploadRow({ upload }: { upload: MyUpload }) {
  const s = STATUS[upload.status];
  return (
    <View style={[styles.row, { borderLeftColor: upload.category?.color ?? categoryFallbackColor }]} testID={`upload-${upload.id}`}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{upload.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {upload.category?.name ?? '기타'} · {formatDuration(upload.duration)} · {upload.price > 0 ? `🪙 ${upload.price}` : '무료'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[styles.badge, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
        <Text style={styles.rowMeta}>담은 사람 {upload.collectedCount}명</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl, gap: space.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: space.sm },
  labelHint: { color: colors.faint, fontWeight: '400', fontSize: 12 },
  fileBox: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.bg,
  },
  fileName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  fileMeta: { color: colors.faint, fontSize: 11, marginTop: 2 },
  input: { color: colors.text, fontSize: 15, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hint: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.sm },
  checkText: { color: colors.text, fontSize: 13, flex: 1 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: space.sm },
  empty: { color: colors.faint, fontSize: 13 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md,
    borderLeftWidth: 4, padding: space.md,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '800', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
});
