import { Ionicons } from '@expo/vector-icons';
import { BetaLoginButton } from '@/components/BetaLoginButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlockLoader } from '@/components/BlockLoader';
import { catalogApi, sellerApi } from '@/api/endpoints';
import type { Block, BlockDesign, MyUpload, TalkType, UploadDraft } from '@/api/types';
import { BlockCard } from '@/components/BlockCard';
import { Button, Chip, EmptyState } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { formatDuration } from '@/lib/format';
import { MAX_STICKERS, PATTERNS } from '@/lib/stickers';
import { StickerArt } from '@/components/StickerArt';
import { Trimmer } from '@/components/upload/Trimmer';
import { canTrim, initialRange, trimParams, type TrimRange } from '@/lib/trim';
import { useStickers } from '@/store/stickers';
import { useAuth } from '@/store/auth';
import { categoryFallbackColor, colors, radius, space, talkLabel } from '@/theme';

const PRICE_STEPS = [10, 20, 30, 50, 100];
const TALKS: TalkType[] = ['NONE', 'WHISPER', 'TALK'];

type PickedMedia = ImagePicker.ImagePickerAsset;
type Kind = 'audio' | 'video';
/** 고른 소리 파일이나 영상 (휴대폰은 uri, 웹 미리보기는 File) */
type Source = { uri: string; name: string; mimeType: string; size: number | null; webFile?: File | null };

/** 소리 파일·영상을 FormData에 */
function appendSource(form: FormData, field: string, src: Source) {
  if (Platform.OS === 'web' && src.webFile) form.append(field, src.webFile);
  else form.append(field, { uri: src.uri, name: src.name, type: src.mimeType } as unknown as Blob);
}

/** 사진·영상을 FormData에 (웹 미리보기는 File, 휴대폰은 uri) */
function appendMedia(form: FormData, field: string, media: PickedMedia, fallbackName: string, fallbackType: string) {
  if (Platform.OS === 'web' && media.file) form.append(field, media.file);
  else form.append(field, { uri: media.uri, name: media.fileName ?? fallbackName, type: media.mimeType ?? fallbackType } as unknown as Blob);
}

/**
 * ASMR 업로드 (크리에이터): 휴대폰의 녹음 파일 → 이름·트리거·말소리·녹음한 곳·한 줄 소개·가격 → 올리기
 * → 관리자 검수 후 상점에 나옴. 적는 대로 "상점에서는 이렇게 보여요" 카드가 바로 바뀜.
 * 아래에서 내가 올린 블록의 검수 상태와 담은 사람 수를 봄.
 */
export default function UploadScreen() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const policy = useQuery({ queryKey: ['upload-policy'], queryFn: sellerApi.policy, staleTime: 10 * 60_000 });
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const mine = useQuery({ queryKey: ['my-uploads'], queryFn: sellerApi.mine, enabled: status === 'signedIn' });

  // 올릴 것: 소리만(audio) 또는 영상(video, 소리는 영상에서 · 고른 구간으로 소리·화면을 같이 잘라 싱크가 맞음)
  const [kind, setKind] = useState<Kind>('audio');
  const [file, setFile] = useState<Source | null>(null);
  // 구간 고르기: 파일을 고르면 먼저 올려서 파형을 받음 (그동안 이름·트리거를 적으면 돼요)
  const [draft, setDraft] = useState<UploadDraft | null>(null);
  const [draftPending, setDraftPending] = useState(false);
  const [range, setRange] = useState<TrimRange | null>(null);
  const draftToken = useRef(0);
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [price, setPrice] = useState(0);
  const [talkType, setTalkType] = useState<TalkType>('NONE');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [ownRecording, setOwnRecording] = useState(false);
  // 블록 꾸미기(C안): 사진이 있으면 사진, 없으면 스티커 + 무늬
  const [cover, setCover] = useState<PickedMedia | null>(null);
  const [stickers, setStickers] = useState<string[]>([]);
  // 고를 수 있는 스티커 (관리자가 숨긴 것은 빼고, 서버 순서대로)
  const stickerChoices = useStickers().list.filter((st) => st.active);
  const [pattern, setPattern] = useState<BlockDesign['pattern']>('dots');

  const maxPrice = policy.data?.maxPrice ?? 100;
  const maxFileMb = policy.data?.maxFileMb ?? 50;
  const maxVideoMb = policy.data?.maxVideoMb ?? 200;
  const minSeconds = policy.data?.minSeconds ?? 10;
  const maxSeconds = policy.data?.maxSeconds ?? 1200;
  const group = categories.data?.find((g) => g.id === groupId);

  const clearFile = () => {
    draftToken.current += 1;
    setFile(null);
    setDraft(null);
    setRange(null);
    setDraftPending(false);
  };
  const switchKind = (k: Kind) => {
    if (k === kind) return;
    clearFile();
    setKind(k);
  };

  /** 소리는 파일 앱에서, 영상은 사진 앱(갤러리)에서 */
  const chooseSource = async (): Promise<Source | null> => {
    if (kind === 'video') {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false });
      const a = result.canceled ? null : result.assets[0];
      return a ? { uri: a.uri, name: a.fileName ?? 'video.mp4', mimeType: a.mimeType ?? 'video/mp4', size: a.fileSize ?? null, webFile: a.file } : null;
    }
    const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
    const a = result.canceled ? null : result.assets[0];
    return a ? { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'audio/mpeg', size: a.size ?? null, webFile: a.file } : null;
  };

  const pick = async () => {
    const picked = await chooseSource();
    if (!picked) return;
    const limit = kind === 'video' ? maxVideoMb : maxFileMb;
    if (picked.size && picked.size > limit * 1024 * 1024) {
      notify('파일이 너무 커요', `${kind === 'video' ? '영상은' : '소리 파일은'} ${limit}MB까지 올릴 수 있어요.`);
      return;
    }
    setFile(picked);
    if (!title.trim()) setTitle(picked.name.replace(/\.[^.]+$/, '').slice(0, 100));
    // 먼저 올려서 파형 받기. 실패하면 구간 고르기 없이 파일을 그대로 올림
    const token = ++draftToken.current;
    setDraft(null);
    setRange(null);
    setDraftPending(true);
    try {
      const form = new FormData();
      appendSource(form, 'file', picked);
      const d = await sellerApi.draft(form, kind);
      if (token !== draftToken.current) return;
      setDraft(d);
      setRange(initialRange(d.duration, maxSeconds));
    } catch (e) {
      if (token === draftToken.current) notify('파형을 만들지 못했어요', `${(e as Error).message}\n구간 고르기 없이 파일 그대로 올릴 수 있어요.`);
    } finally {
      if (token === draftToken.current) setDraftPending(false);
    }
  };

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled || !result.assets[0]) return;
    const picked = result.assets[0];
    const maxMb = policy.data?.maxImageMb ?? 10;
    if (picked.fileSize && picked.fileSize > maxMb * 1024 * 1024) {
      notify('파일이 너무 커요', `${maxMb}MB까지 올릴 수 있어요.`);
      return;
    }
    setCover(picked);
  };
  const toggleSticker = (code: string) => setStickers((list) => (list.includes(code) ? list.filter((c) => c !== code)
    : list.length >= MAX_STICKERS ? list : [...list, code]));

  const reset = () => {
    clearFile();
    setCover(null);
    setStickers([]);
    setTitle('');
    setGroupId(null);
    setCategoryId(null);
    setPrice(0);
    setTalkType('NONE');
    setPlace('');
    setNote('');
    setOwnRecording(false);
  };

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      // 먼저 올린 파일이 있으면 그걸 쓰고(다시 안 보냄), 고른 구간만
      if (draft) {
        form.append('draftId', draft.draftId);
        const trim = trimParams(range, draft.duration);
        if (trim) {
          form.append('trimStart', String(trim.trimStart));
          form.append('trimEnd', String(trim.trimEnd));
        }
      } else if (file) {
        appendSource(form, kind === 'video' ? 'video' : 'file', file);
      }
      if (cover) appendMedia(form, 'cover', cover, 'cover.jpg', 'image/jpeg');
      if (stickers.length) form.append('stickers', stickers.join(','));
      form.append('pattern', pattern);
      form.append('title', title.trim());
      form.append('categoryId', String(categoryId));
      form.append('license', 'OWN');
      form.append('price', String(price));
      form.append('talkType', talkType);
      if (place.trim()) form.append('recordedPlace', place.trim());
      if (note.trim()) form.append('description', note.trim());
      return sellerApi.upload(form);
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['my-uploads'] });
      notify('올렸어요!', '검수가 끝나면 상점에 나와요. 아래 "내가 올린 블록"에서 상태를 볼 수 있어요.');
    },
    onError: (e) => notify('올리지 못했어요', (e as Error).message),
  });

  const tooShort = draft && !canTrim(draft.duration, minSeconds);
  const missing = !file ? (kind === 'video' ? '영상을 골라주세요' : '소리 파일을 골라주세요') : draftPending ? '파일 올리는 중…'
    : tooShort ? `${minSeconds}초보다 긴 소리를 골라주세요` : !title.trim() ? '이름을 적어주세요' : !categoryId ? '트리거 종류를 골라주세요'
    : !ownRecording ? '직접 녹음한 소리인지 확인해주세요' : null;

  if (status !== 'signedIn') {
    return (
      <View style={styles.screen}>
        <EmptyState icon="cloud-upload-outline" title="로그인하면 내 트리거를 블록으로 팔 수 있어요"
          message="직접 녹음한 탭핑·바스락·귓속말이면 돼요. 검수 후 블록 상점에 올라가요.">
          <BetaLoginButton style={{ marginTop: space.md }} />
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

        <Text style={styles.label}>올릴 것</Text>
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {([
            { k: 'audio', icon: 'musical-notes', title: '소리만', body: '녹음 파일 (m4a·mp3·wav…)' },
            { k: 'video', icon: 'videocam', title: '영상', body: '소리는 영상에서, 같은 구간으로 같이 잘려요' },
          ] as const).map((o) => {
            const on = kind === o.k;
            return (
              <Pressable key={o.k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => switchKind(o.k)}
                style={[styles.kind, on && styles.kindOn]} testID={`upload-kind-${o.k}`}>
                <Ionicons name={o.icon} size={18} color={on ? colors.primaryText : colors.faint} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.kindTitle, on && { color: colors.primaryText }]}>{o.title}</Text>
                  <Text style={styles.kindBody}>{o.body}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={kind === 'video' ? '영상 고르기' : '소리 파일 고르기'} onPress={pick}
          style={[styles.fileBox, { marginTop: space.sm }]} testID="pick-file">
          <Ionicons name={file ? (kind === 'video' ? 'videocam' : 'musical-note') : kind === 'video' ? 'images-outline' : 'folder-open-outline'}
            size={20} color={file ? colors.primary : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file ? `${file.name} · 눌러서 바꾸기` : kind === 'video' ? '갤러리에서 영상 고르기' : '휴대폰에서 소리 파일 고르기'}
            </Text>
            <Text style={styles.fileMeta}>
              {file?.size ? `${(file.size / 1024 / 1024).toFixed(1)}MB · ` : ''}
              {!policy.data ? ' ' : kind === 'video'
                ? `${policy.data.videoExtensions.join(', ')} · ${maxVideoMb}MB까지 · 듣는 사람이 "영상도 같이 보기"를 켜면 보여요`
                : `${policy.data.extensions.join(', ')} · ${maxFileMb}MB까지`}
            </Text>
          </View>
        </Pressable>

        {/* 구간 고르기: 길게 녹음했으면 쓸 부분만 (영상이면 화면도 같이) */}
        {file && draftPending && <BlockLoader size="small" label="파형을 만드는 중…" style={{ marginTop: space.sm }} />}
        {file && draft && range && canTrim(draft.duration, minSeconds) && (
          <>
            {draft.duration > maxSeconds && (
              <Text style={[styles.hint, { color: colors.warn, marginTop: space.sm }]}>
                {maxSeconds / 60}분이 넘어서 앞 {maxSeconds / 60}분을 골라 뒀어요. 손잡이로 바꿀 수 있어요.
              </Text>
            )}
            <Trimmer uri={file.uri} duration={draft.duration} peaks={draft.peaks} range={range} onChange={setRange}
              min={minSeconds} max={maxSeconds} video={kind === 'video'} />
          </>
        )}

        <Text style={styles.label}>블록 꾸미기 <Text style={styles.labelHint}>· 사진이 있으면 사진, 없으면 스티커</Text></Text>
        <Pressable accessibilityRole="button" accessibilityLabel="겉면 사진 고르기" onPress={() => (cover ? setCover(null) : pickCover())}
          style={styles.fileBox} testID="pick-cover">
          {cover ? <Image source={{ uri: cover.uri }} style={styles.coverThumb} /> : <Ionicons name="image-outline" size={20} color={colors.muted} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>{cover ? '겉면 사진 · 눌러서 빼기' : '겉면 사진 고르기 (선택)'}</Text>
            <Text style={styles.fileMeta}>녹음한 장소나 장면 사진이면 좋아요</Text>
          </View>
        </Pressable>
        <Text style={[styles.hint, { marginTop: space.sm }]}>스티커 최대 {MAX_STICKERS}개{cover ? ' (사진을 빼면 보여요)' : ''}</Text>
        <View style={styles.stickerGrid}>
          {stickerChoices.map((st) => {
            const on = stickers.includes(st.code);
            return (
              <Pressable key={st.code} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggleSticker(st.code)}
                style={[styles.sticker, on && styles.stickerOn]} testID={`sticker-${st.code}`}>
                <StickerArt sticker={st} width={30} height={24} />
                <Text style={[styles.stickerLabel, on && { color: colors.primaryText }]} numberOfLines={1}>{st.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.chips, { marginTop: space.sm }]}>
          {PATTERNS.map((p) => <Chip key={p.key} label={`무늬 ${p.label}`} small active={pattern === p.key} onPress={() => setPattern(p.key)} />)}
        </View>

        <Text style={styles.label}>이름</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100}
          placeholder="예: 원목 책상 손톱 탭핑" placeholderTextColor={colors.faint} accessibilityLabel="이름" testID="upload-title" />

        <Text style={styles.label}>트리거 종류</Text>
        <View style={styles.chips}>
          {(categories.data ?? []).map((g) => (
            <Chip key={g.id} label={g.name} color={g.color} small active={groupId === g.id}
              onPress={() => { setGroupId(g.id); setCategoryId(null); }} testID={`upload-group-${g.code}`} />
          ))}
        </View>
        {group && (
          <View style={[styles.chips, styles.subChips]}>
            {group.children.map((c) => (
              <Chip key={c.id} label={c.name} small active={categoryId === c.id} onPress={() => setCategoryId(c.id)} testID={`upload-sub-${c.code}`} />
            ))}
          </View>
        )}

        <Text style={styles.label}>말소리</Text>
        <View style={styles.chips}>
          {TALKS.map((t) => (
            <Chip key={t} label={talkLabel[t]} small active={talkType === t} onPress={() => setTalkType(t)} testID={`upload-talk-${t}`} />
          ))}
        </View>

        <Text style={styles.label}>녹음한 곳 <Text style={styles.labelHint}>· 선택</Text></Text>
        <TextInput style={styles.input} value={place} onChangeText={setPlace} maxLength={60}
          placeholder="예: 도쿄 신주쿠역 앞" placeholderTextColor={colors.faint} accessibilityLabel="녹음한 곳" testID="upload-place" />
        <Text style={styles.hint}>특별한 곳에서 녹음했다면 적어 주세요. 집 주소처럼 너무 자세한 곳은 적지 않아요.</Text>

        <Text style={styles.label}>한 줄 소개 <Text style={styles.labelHint}>· 선택</Text></Text>
        <TextInput style={styles.input} value={note} onChangeText={setNote} maxLength={80}
          placeholder="예: 손톱 끝으로 톡톡, 마이크를 아주 가까이 댔어요" placeholderTextColor={colors.faint}
          accessibilityLabel="한 줄 소개" testID="upload-note" />

        <Text style={styles.label}>가격 <Text style={styles.labelHint}>· 최대 {maxPrice}코인</Text></Text>
        <View style={styles.chips}>
          <Chip label="무료" active={price === 0} onPress={() => setPrice(0)} />
          {PRICE_STEPS.filter((p) => p <= maxPrice).map((p) => (
            <Chip key={p} label={`${p}코인`} active={price === p} onPress={() => setPrice(p)} />
          ))}
        </View>
        <Text style={styles.hint}>유료 블록은 사기 전 앞 30초만 들려줘요. 무료 블록은 누구나 바로 담을 수 있어요.</Text>

        <Text style={styles.label}>상점에서는 이렇게 보여요</Text>
        <BlockCard reportable={false} block={previewBlock({ title, note, price, talkType, place, nickname: user?.nickname ?? '나',
          duration: range ? range.end - range.start : draft?.duration ?? 200,
          category: group?.children.find((c) => c.id === categoryId) ?? null, groupName: group?.name ?? null,
          design: { coverUrl: cover?.uri ?? null, stickers, pattern, hasVideo: !!file && kind === 'video', videoUrl: null } })}
          previewing={false} onPreview={() => {}} showNote style={styles.preview} />

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
      {mine.isLoading ? <BlockLoader size="small" />
        : (mine.data?.content ?? []).length === 0 ? <Text style={styles.empty}>아직 올린 블록이 없어요</Text>
          : mine.data!.content.map((u) => <UploadRow key={u.id} upload={u} />)}
    </ScrollView>
  );
}

/** 올리기 전 미리보기용 블록 (아직 서버에 없음) */
function previewBlock(f: {
  title: string; note: string; price: number; talkType: TalkType; place: string; nickname: string; duration: number;
  category: Block['category']; groupName: string | null; design: BlockDesign;
}): Block {
  return {
    id: 7, title: f.title.trim() || '이름 없음', description: f.note.trim() || null, fileUrl: null, previewUrl: null,
    price: f.price, owned: false, duration: Math.round(f.duration), talkType: f.talkType, recordedPlace: f.place.trim() || null, design: f.design,
    license: 'OWN', attribution: null, status: 'PENDING',
    category: f.category ? { ...f.category, parentName: f.groupName } : null,
    tags: [], uploader: { id: 0, nickname: f.nickname }, playCount: 0, recentPlays: null,
  };
}

const STATUS = {
  PENDING: { label: '검수 중', color: colors.warn },
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
          {upload.category?.name ?? '기타'} · {talkLabel[upload.talkType ?? 'NONE']} · {formatDuration(upload.duration)} · {upload.price > 0 ? `${upload.price}코인` : '무료'}
          {upload.recordedPlace ? ` · ${upload.recordedPlace}` : ''}
        </Text>
        {upload.status === 'REJECTED' && upload.reviewNote ? (
          <Text style={styles.reviewNote} testID={`review-note-${upload.id}`}>돌려보낸 이유: {upload.reviewNote}</Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={[styles.badge, { color: s.color, borderColor: s.color }]}>{s.label}</Text>
        <Text style={styles.rowMeta}>담은 사람 {upload.collectedCount}명</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewNote: { marginTop: 4, fontSize: 12, color: colors.danger, lineHeight: 17 },
  coverThumb: { width: 48, height: 28, borderRadius: 4 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  sticker: {
    width: 64, alignItems: 'center', gap: 2, paddingTop: 6, paddingBottom: 4, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  stickerOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  stickerLabel: { color: colors.muted, fontSize: 10 },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl, gap: space.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: space.sm },
  labelHint: { color: colors.faint, fontWeight: '400', fontSize: 12 },
  kinds: { flexDirection: 'row', gap: space.sm },
  kind: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: space.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  kindOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  kindTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  kindBody: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  fileBox: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.bg,
  },
  fileName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  fileMeta: { color: colors.faint, fontSize: 11, marginTop: 2 },
  input: { color: colors.text, fontSize: 15, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChips: { marginTop: space.sm, padding: space.sm, borderRadius: radius.md, backgroundColor: colors.cardActive },
  preview: { width: 220, marginTop: space.xs },
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
