import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/api/client';
import { catalogApi, libraryApi } from '@/api/endpoints';
import type { Block, TalkType } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { BlockCard } from '@/components/BlockCard';
import { Button, Chip, EmptyState } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

type Tab = 'hot' | 'all' | 'free' | 'mine';
const TABS: { key: Tab; label: string }[] = [
  { key: 'hot', label: '요즘 뜨는' },
  { key: 'all', label: '전체' },
  { key: 'free', label: '무료' },
  { key: 'mine', label: '내 블록함' },
];
const TALKS: { key: TalkType | null; label: string }[] = [
  { key: null, label: '말소리 전체' },
  { key: 'NONE', label: '노토킹만' },
  { key: 'WHISPER', label: '속삭임만' },
];

/** 요즘 뜨는 / 내 블록함은 서버 필터가 없어서 화면에서 거름 */
function matches(b: Block, groupId: number | null, subId: number | null, talk: TalkType | null, keyword: string) {
  if (subId !== null && b.category?.id !== subId) return false;
  if (subId === null && groupId !== null && b.category?.parentId !== groupId && b.category?.id !== groupId) return false;
  if (talk && b.talkType !== talk) return false;
  if (keyword) {
    const text = `${b.title} ${b.uploader.nickname} ${b.recordedPlace ?? ''}`.toLowerCase();
    if (!text.includes(keyword.toLowerCase())) return false;
  }
  return true;
}

/**
 * 블록 상점: 트리거(탭핑·바스락·귓속말 …)별로 골라 "담기".
 * 노토킹만 / 속삭임만 거르기, 이름·크리에이터·녹음한 곳으로 찾기.
 * 담은 블록은 내 블록함에 들어가고, 편집기에서는 담은 블록만 써요 (몇 번 복제해도 무료)
 */
export default function ShopScreen() {
  const [tab, setTab] = useState<Tab>('hot');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [talk, setTalk] = useState<TalkType | null>(null);
  const [typed, setTyped] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setKeyword(typed.trim()), 300);
    return () => clearTimeout(t);
  }, [typed]);

  const signedIn = useAuth((s) => s.status === 'signedIn');
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const filterId = subId ?? groupId;
  const serverFiltered = tab === 'all' || tab === 'free';

  const trending = useQuery({ queryKey: ['blocks', 'trending', 30], queryFn: () => catalogApi.trending(30), enabled: tab === 'hot' });
  const mine = useQuery({ queryKey: ['library'], queryFn: libraryApi.mine, enabled: signedIn });
  const blocks = useQuery({
    queryKey: ['blocks', tab, filterId, talk, keyword],
    queryFn: () => catalogApi.blocks({ categoryId: filterId, talkType: talk, keyword: keyword || undefined, free: tab === 'free' ? true : undefined }),
    enabled: serverFiltered,
  });

  const preview = usePreview();
  const group = categories.data?.find((g) => g.id === groupId);
  const query = tab === 'hot' ? trending : tab === 'mine' ? mine : blocks;
  const raw: Block[] = tab === 'hot' ? trending.data ?? [] : tab === 'mine' ? mine.data ?? [] : blocks.data?.content ?? [];
  const data = serverFiltered ? raw : raw.filter((b) => matches(b, groupId, subId, talk, keyword));
  // 두 칸 격자에서 마지막 한 개가 가로로 늘어나지 않도록 빈칸을 채움
  const gridData: (Block | null)[] = data.length % 2 ? [...data, null] : data;
  const pickGroup = (id: number | null) => { setGroupId(id); setSubId(null); };

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={15} color={colors.faint} />
          <TextInput value={typed} onChangeText={setTyped} placeholder="소리, 크리에이터, 녹음한 곳" placeholderTextColor={colors.faint}
            style={styles.searchInput} returnKeyType="search" accessibilityLabel="소리 찾기" testID="shop-search" />
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabOn]} testID={`tab-${t.key}`}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>
              {t.label}{t.key === 'mine' && signedIn ? ` ${mine.data?.length ?? ''}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
        <Chip label="모든 트리거" active={groupId === null} onPress={() => pickGroup(null)} small />
        {(categories.data ?? []).map((g) => (
          <Chip key={g.id} label={g.name} color={g.color} active={groupId === g.id} onPress={() => pickGroup(g.id)} small testID={`group-${g.code}`} />
        ))}
      </ScrollView>
      {group && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
          <Chip label={`${group.name} 전체`} active={subId === null} onPress={() => setSubId(null)} small />
          {group.children.map((c) => (
            <Chip key={c.id} label={c.name} active={subId === c.id} onPress={() => setSubId(c.id)} small />
          ))}
        </ScrollView>
      )}
      <View style={styles.talkRow}>
        {TALKS.map((t) => (
          <Pressable key={t.label} accessibilityRole="button" accessibilityState={{ selected: talk === t.key }} onPress={() => setTalk(t.key)}
            hitSlop={6} testID={`talk-${t.key ?? 'ALL'}`}>
            <Text style={[styles.talkText, talk === t.key && styles.talkOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        key="grid"
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        data={gridData}
        keyExtractor={(b) => (b ? String(b.id) : 'spacer')}
        ListHeaderComponent={
          <Text style={styles.caption}>
            {tab === 'hot' ? '최근 7일 동안 팅글 많이 온 블록이에요 · 블록 길이 = 소리 길이'
              : tab === 'mine' ? '담은 블록은 편집기 블록 상자에 나와요 · 몇 번을 복제해도 무료'
                : tab === 'free' ? '무료 블록은 바로 내 블록함에 담을 수 있어요'
                  : group?.description ?? '코인 결제는 준비 중이라 지금은 무료 블록만 담을 수 있어요'}
          </Text>
        }
        renderItem={({ item, index }) => !item ? <View style={styles.card} /> : (
          <BlockCard block={item} style={styles.card} showNote rank={tab === 'hot' && index < 3 ? index + 1 : undefined}
            previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)}
            right={<CollectButton block={item} inLibraryView={tab === 'mine'} />} />
        )}
        ListEmptyComponent={
          tab === 'mine' && !signedIn ? (
            <EmptyState icon="lock-closed-outline" title="로그인하면 블록을 담을 수 있어요">
              <Button title="로그인" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
            </EmptyState>
          ) : query.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : query.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(query.error as Error).message} />
              : tab === 'mine' && raw.length === 0 ? <EmptyState icon="cube-outline" title="아직 담은 블록이 없어요" message="무료 블록부터 담아보세요" />
                : <EmptyState icon="musical-notes-outline" title="찾는 소리가 없어요" message="다른 트리거나 이름으로 찾아보세요" />
        }
      />
    </View>
  );
}

/** 담기 버튼: 담기(무료) / 담음 / 빼기(내 블록함의 무료 블록) / 구매 준비 중(유료) */
function CollectButton({ block, inLibraryView }: { block: Block; inLibraryView: boolean }) {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['blocks'] });
    queryClient.invalidateQueries({ queryKey: ['library'] });
  };
  const add = useMutation({
    mutationFn: () => libraryApi.add(block.id),
    onSuccess: refresh,
    onError: (e) => notify(e instanceof ApiError && e.status === 402 ? '구매 준비 중이에요' : '담지 못했어요', (e as Error).message),
  });
  const remove = useMutation({
    mutationFn: () => libraryApi.remove(block.id),
    onSuccess: refresh,
    onError: (e) => notify('빼지 못했어요', (e as Error).message),
  });

  if (block.owned) {
    if (inLibraryView && block.price === 0) {
      return (
        <Pressable accessibilityRole="button" accessibilityLabel={`${block.title} 빼기`} onPress={() => remove.mutate()}
          disabled={remove.isPending} style={[styles.pill, styles.pillGhost]} testID={`remove-${block.id}`}>
          <Text style={styles.pillGhostText}>빼기</Text>
        </Pressable>
      );
    }
    return (
      <View style={[styles.pill, styles.pillDone]} accessibilityLabel={block.price > 0 ? '내 블록' : '담음'}>
        <Ionicons name="checkmark" size={13} color={colors.muted} />
        <Text style={styles.pillDoneText}>{block.price > 0 ? '내 블록' : '블록함에 있음'}</Text>
      </View>
    );
  }
  if (block.price > 0) {
    return (
      <View style={[styles.pill, styles.pillGhost]} accessibilityLabel={`${block.price}코인, 구매 준비 중`}>
        <Text style={styles.soon}>구매 준비 중</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${block.title} 담기`}
      onPress={() => (signedIn ? add.mutate() : router.push('/login'))}
      disabled={add.isPending}
      style={({ pressed }) => [styles.pill, styles.pillAdd, pressed && { opacity: 0.8 }]}
      testID={`collect-${block.id}`}
    >
      {add.isPending ? <ActivityIndicator color={colors.white} size="small" /> : (
        <>
          <Ionicons name="cube" size={13} color={colors.white} />
          <Text style={styles.pillAddText}>블록 담기</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchRow: { paddingHorizontal: space.lg, paddingTop: space.sm },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, paddingHorizontal: space.md,
    borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
  tabs: { flexDirection: 'row', gap: 20, marginHorizontal: space.lg, marginTop: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingVertical: 9 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.primary, marginBottom: -1 },
  tabText: { color: colors.faint, fontSize: 14, fontWeight: '600' },
  tabTextOn: { color: colors.text },
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: { gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  talkRow: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  talkText: { color: colors.faint, fontSize: 12, fontWeight: '600' },
  talkOn: { color: colors.primaryText, textDecorationLine: 'underline' },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  column: { gap: 10 },
  card: { flex: 1, marginBottom: 10 },
  caption: { color: colors.faint, fontSize: 12, marginBottom: space.sm },
  pill: { flexDirection: 'row', gap: 4, minWidth: 48, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pillAdd: { backgroundColor: colors.primary },
  pillAddText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  pillDone: { backgroundColor: colors.cardActive },
  pillDoneText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  pillGhost: { borderWidth: 1, borderColor: colors.border },
  pillGhostText: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  soon: { color: colors.faint, fontSize: 11, fontWeight: '600' },
});
