import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalogApi } from '@/api/endpoints';
import { usePreview } from '@/audio/usePreview';
import { BlockRow } from '@/components/BlockRow';
import { Chip, EmptyState } from '@/components/ui';
import { colors, space } from '@/theme';

const TRENDING = -1;

/**
 * 블록 둘러보기: 메뉴 트리(대분류 > 소분류) + 요즘 뜨는 소리.
 * 사람마다 팅글이 달라서 노이즈파·자연파·나라별 소리·트렌드(왁스 등)로 나눔
 */
export default function ExploreScreen() {
  const [groupId, setGroupId] = useState<number | null>(TRENDING);
  const [subId, setSubId] = useState<number | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const filterId = subId ?? (groupId !== null && groupId !== TRENDING ? groupId : null);
  const trending = useQuery({ queryKey: ['blocks', 'trending'], queryFn: () => catalogApi.trending(20), enabled: groupId === TRENDING });
  const blocks = useQuery({ queryKey: ['blocks', filterId], queryFn: () => catalogApi.blocks({ categoryId: filterId }), enabled: groupId !== TRENDING });
  const preview = usePreview();
  const group = categories.data?.find((g) => g.id === groupId);
  const isTrending = groupId === TRENDING;
  const query = isTrending ? trending : blocks;
  const data = isTrending ? trending.data ?? [] : blocks.data?.content ?? [];

  const pickGroup = (id: number | null) => { setGroupId(id); setSubId(null); };

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
        <Chip label="🔥 요즘 뜨는" active={isTrending} color="#EC4899" onPress={() => pickGroup(TRENDING)} />
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
        ListHeaderComponent={
          isTrending ? <Text style={styles.caption}>최근 7일 동안 많이 들은 소리예요</Text>
            : group?.description ? <Text style={styles.caption}>{group.description}</Text> : undefined
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            {isTrending && <Text style={[styles.rank, index < 3 && { color: '#EC4899' }]}>{index + 1}</Text>}
            <View style={{ flex: 1 }}>
              <BlockRow block={item} previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          query.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : query.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(query.error as Error).message} />
              : <EmptyState icon="musical-notes-outline" title="아직 블록이 없어요" />
        }
      />
    </View>
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
});
