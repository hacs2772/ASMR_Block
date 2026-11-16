import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BlockLoader } from '@/components/BlockLoader';
import { catalogApi, libraryApi } from '@/api/endpoints';
import type { Block, TalkType } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { BlockCard } from '@/components/BlockCard';
import { BlockCollectButton } from '@/components/BlockCollectButton';
import { Button, Chip, EmptyState } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';
import { categoryLabel, groupDescription } from '@/lib/labels';

type Tab = 'hot' | 'all' | 'free' | 'mine';
/** 이름 = 사전 shop.tabs.{key} · shop.talk.{key ?? ALL} */
const TABS: Tab[] = ['hot', 'all', 'free', 'mine'];
const TALKS: (TalkType | null)[] = [null, 'NONE', 'WHISPER'];

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
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('hot');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [subId, setSubId] = useState<number | null>(null);
  const [talk, setTalk] = useState<TalkType | null>(null);
  const [typed, setTyped] = useState('');
  const [keyword, setKeyword] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(typed.trim()), 300);
    return () => clearTimeout(timer);
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
          <TextInput value={typed} onChangeText={setTyped} placeholder={t('shop.searchPh')} placeholderTextColor={colors.faint}
            style={styles.searchInput} returnKeyType="search" accessibilityLabel={t('shop.searchA11y')} testID="shop-search" />
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((key) => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabOn]} testID={`tab-${key}`}>
            <Text style={[styles.tabText, tab === key && styles.tabTextOn]} numberOfLines={1}>
              {t(`shop.tabs.${key}`)}{key === 'mine' && signedIn ? ` ${mine.data?.length ?? ''}` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
        <Chip label={t('shop.allTriggers')} active={groupId === null} onPress={() => pickGroup(null)} small />
        {(categories.data ?? []).map((g) => (
          <Chip key={g.id} label={categoryLabel(g)} color={g.color} active={groupId === g.id} onPress={() => pickGroup(g.id)} small testID={`group-${g.code}`} />
        ))}
      </ScrollView>
      {group && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
          <Chip label={t('shop.groupAll', { name: categoryLabel(group) })} active={subId === null} onPress={() => setSubId(null)} small />
          {group.children.map((c) => (
            <Chip key={c.id} label={categoryLabel(c)} active={subId === c.id} onPress={() => setSubId(c.id)} small />
          ))}
        </ScrollView>
      )}
      <View style={styles.talkRow}>
        {TALKS.map((key) => (
          <Pressable key={key ?? 'ALL'} accessibilityRole="button" accessibilityState={{ selected: talk === key }} onPress={() => setTalk(key)}
            hitSlop={6} testID={`talk-${key ?? 'ALL'}`}>
            <Text style={[styles.talkText, talk === key && styles.talkOn]}>{t(`shop.talk.${key ?? 'ALL'}`)}</Text>
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
            {tab === 'hot' ? t('shop.hintHot')
              : tab === 'mine' ? t('shop.hintMine')
                : tab === 'free' ? t('shop.hintFree')
                  : (group && groupDescription(group)) || t('shop.hintCoins')}
          </Text>
        }
        renderItem={({ item, index }) => !item ? <View style={styles.card} /> : (
          <BlockCard block={item} style={styles.card} showNote rank={tab === 'hot' && index < 3 ? index + 1 : undefined}
            previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)}
            right={<BlockCollectButton block={item} inLibraryView={tab === 'mine'} />} />
        )}
        ListEmptyComponent={
          tab === 'mine' && !signedIn ? (
            <EmptyState icon="lock-closed-outline" title={t('shop.loginTitle')}>
              <Button title={t('shop.login')} onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
            </EmptyState>
          ) : query.isLoading ? <BlockLoader style={{ marginTop: 40 }} />
            : query.isError ? <EmptyState icon="cloud-offline-outline" title={t('errors.offline')} message={(query.error as Error).message} />
              : tab === 'mine' && raw.length === 0 ? <EmptyState icon="cube-outline" title={t('shop.mineEmptyTitle')} message={t('shop.mineEmptyBody')} />
                : <EmptyState icon="musical-notes-outline" title={t('shop.notFoundTitle')} message={t('shop.notFoundBody')} />
        }
      />
    </View>
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
});
