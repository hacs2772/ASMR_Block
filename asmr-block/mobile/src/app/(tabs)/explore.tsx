import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { catalogApi } from '@/api/endpoints';
import { usePreview } from '@/audio/usePreview';
import { BlockRow } from '@/components/BlockRow';
import { Chip, EmptyState } from '@/components/ui';
import { colors, space } from '@/theme';

/** 블록 둘러보기 + 미리듣기 */
export default function ExploreScreen() {
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const blocks = useQuery({ queryKey: ['blocks', categoryId], queryFn: () => catalogApi.blocks({ categoryId }) });
  const preview = usePreview();

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
        <Chip label="전체" active={categoryId === null} onPress={() => setCategoryId(null)} />
        {(categories.data ?? []).map((c) => (
          <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
        ))}
      </ScrollView>
      <FlatList
        contentContainerStyle={styles.list}
        data={blocks.data?.content ?? []}
        keyExtractor={(b) => String(b.id)}
        renderItem={({ item }) => (
          <BlockRow block={item} previewing={preview.previewId === item.id} onPreview={() => preview.toggle(item)} />
        )}
        ListEmptyComponent={
          blocks.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            : blocks.isError ? <EmptyState icon="cloud-offline-outline" title="서버에 연결할 수 없어요" message={(blocks.error as Error).message} />
              : <EmptyState icon="musical-notes-outline" title="이 카테고리에는 아직 블록이 없어요" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  chipBar: { flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl },
});
