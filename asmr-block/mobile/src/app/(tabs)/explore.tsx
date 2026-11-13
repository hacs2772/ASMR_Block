import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { catalogApi, libraryApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { BlockRow } from '@/components/BlockRow';
import { Button, Chip, EmptyState } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

const TRENDING = -1;
const FREE = -2;
const MINE = -3;

/**
 * 블록 상점: 요즘 뜨는 소리 · 무료 · 메뉴 트리(자연, 일본 소리 …)에서 블록을 "담기".
 * 담은 블록은 내 블록함에 들어가고, 편집기에서는 담은 블록만 써요 (몇 번 복제해도 무료)
 */
export default function ShopScreen() {
  const [groupId, setGroupId] = useState<number | null>(TRENDING);
  const [subId, setSubId] = useState<number | null>(null);
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const filterId = subId ?? (groupId !== null && groupId > 0 ? groupId : null);
  const special = groupId !== null && groupId < 0;

  const trending = useQuery({ queryKey: ['blocks', 'trending'], queryFn: () => catalogApi.trending(20), enabled: groupId === TRENDING });
  const free = useQuery({ queryKey: ['blocks', 'free'], queryFn: () => catalogApi.blocks({ free: true }), enabled: groupId === FREE });
  const mine = useQuery({ queryKey: ['library'], queryFn: libraryApi.mine, enabled: groupId === MINE && signedIn });
  const blocks = useQuery({ queryKey: ['blocks', filterId], queryFn: () => catalogApi.blocks({ categoryId: filterId }), enabled: !special });

  const preview = usePreview();
  const group = categories.data?.find((g) => g.id === groupId);
  const query = groupId === TRENDING ? trending : groupId === FREE ? free : groupId === MINE ? mine : blocks;
  const data: Block[] =
    groupId === TRENDING ? trending.data ?? []
      : groupId === FREE ? free.data?.content ?? []
        : groupId === MINE ? mine.data ?? []
          : blocks.data?.content ?? [];

  const pickGroup = (id: number | null) => { setGroupId(id); setSubId(null); };
  const caption =
    groupId === TRENDING ? '최근 7일 동안 많이 들은 소리예요'
      : groupId === FREE ? '무료 블록은 바로 담을 수 있어요'
        : groupId === MINE ? '담은 블록은 편집기 블록 상자에 나와요 · 몇 번을 복제해도 무료'
          : group?.description ?? undefined;

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
        <Chip label="🔥 요즘 뜨는" active={groupId === TRENDING} color="#EC4899" onPress={() => pickGroup(TRENDING)} />
        <Chip label="무료" active={groupId === FREE} color={colors.success} onPress={() => pickGroup(FREE)} />
        <Chip label="📦 내 블록함" active={groupId === MINE} onPress={() => pickGroup(MINE)} />
        <Chip label="전체" active={groupId === null} onPress={() => pickGroup(null)} />
        {(categories.data ?? []).map((g) => (
          <Chip key={g.id} label={g.name} color={g.color} active={groupId === g.id} onPress={() => pickGroup(g.id)} />
        ))}
      </ScrollView>
      {group && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.subChips}>
          <Chip label={`${group.name} 전체`} color={group.color} active={subId === null} onPress={() => setSubId(null)} />
          {group.children.map((c) => (
            <Chip key={c.id} label={c.name} color={c.color} active={subId === c.id} onPress={() => setSubId(c.id)} />
          ))}
        </ScrollView>
      )}
      <FlatList
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(b) => String(b.id)}
        ListHeaderComponent={caption ? <Text style={styles.caption}>{caption}</Text> : undefined}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            {groupId === TRENDING && <Text style={[styles.rank, index < 3 && { color: '#EC4899' }]}>{index + 1}</Text>}
            <View style={{ flex: 1 }}>
              <BlockRow block={item} previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)}
                right={<CollectButton block={item} inLibraryView={groupId === MINE} />} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          groupId === MINE && !signedIn ? (
            <EmptyState icon="lock-closed-outline" title="로그인하면 블록을 담을 수 있어요">
              <Button title="로그인" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch', marginTop: space.md }} />
            </EmptyState>
          ) : query.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : query.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(query.error as Error).message} />
              : groupId === MINE ? <EmptyState icon="cube-outline" title="아직 담은 블록이 없어요" message="무료 블록부터 담아보세요" />
                : <EmptyState icon="musical-notes-outline" title="아직 블록이 없어요" />
        }
      />
    </View>
  );
}

/** 담기 버튼: 담음 ✓ / 담기(무료) / 🪙 가격 · 구매 준비 중(유료) / 빼기(내 블록함에서 무료 블록) */
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
      <View style={[styles.pill, styles.pillDone]} accessibilityLabel="담음">
        <Text style={styles.pillDoneText}>✓ 담음</Text>
      </View>
    );
  }
  if (block.price > 0) {
    return (
      <View style={styles.priceBox} accessibilityLabel={`${block.price}코인, 구매 준비 중`}>
        <Text style={styles.price}>🪙 {block.price}</Text>
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
      {add.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.pillAddText}>담기</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  chipBar: { flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  subChips: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  caption: { color: colors.faint, fontSize: 12, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rank: { color: colors.muted, fontSize: 18, fontWeight: '800', width: 22, textAlign: 'center' },
  pill: { minWidth: 58, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pillAdd: { backgroundColor: colors.primary },
  pillAddText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pillDone: { backgroundColor: colors.primarySoft },
  pillDoneText: { color: '#C7C8FF', fontWeight: '700', fontSize: 13 },
  pillGhost: { borderWidth: 1, borderColor: colors.border },
  pillGhostText: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  priceBox: { alignItems: 'flex-end', minWidth: 64 },
  price: { color: '#FCD34D', fontWeight: '800', fontSize: 14 },
  soon: { color: colors.faint, fontSize: 11, marginTop: 2 },
});
