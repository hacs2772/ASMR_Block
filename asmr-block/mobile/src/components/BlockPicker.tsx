import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { catalogApi } from '@/api/endpoints';
import type { Block } from '@/api/types';
import { usePreview } from '@/audio/usePreview';
import { useEditor } from '@/store/editor';
import { colors, space } from '@/theme';
import { BlockRow } from './BlockRow';
import { Button, Chip, EmptyState } from './ui';

const TOWER_LABEL = { main: '메인 동', background: '배경 동' } as const;

/** 블록 고르기 창: + 를 누르면 지금 선택된 동 맨 위층에 쌓임 (여러 개 연속으로 가능) */
export function BlockPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { activeTower, setActiveTower, addBlock, main, background } = useEditor();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories, staleTime: Infinity });
  const blocks = useQuery({ queryKey: ['blocks', categoryId], queryFn: () => catalogApi.blocks({ categoryId }) });
  const preview = usePreview();

  const add = (block: Block) => {
    addBlock({ id: block.id, title: block.title, duration: block.duration, fileUrl: block.fileUrl, category: block.category });
    const floor = (activeTower === 'main' ? main.blocks.length : background.blocks.length) + 1;
    setLastAdded(`${TOWER_LABEL[activeTower]} ${floor}층에 "${block.title}" 쌓음`);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={[styles.screen, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>블록 쌓기</Text>
          <Button title="완료" variant="secondary" onPress={onClose} style={styles.done} testID="picker-done" />
        </View>

        <View style={styles.towerSwitch}>
          <Text style={styles.switchLabel}>쌓을 곳</Text>
          <Chip label="메인 동" active={activeTower === 'main'} onPress={() => setActiveTower('main')} />
          <Chip label="배경 동" active={activeTower === 'background'} onPress={() => setActiveTower('background')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
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
            <BlockRow
              block={item}
              previewing={preview.previewId === item.id}
              onPreview={() => preview.toggle(item)}
              onAdd={() => add(item)}
              addLabel={`${item.title} ${TOWER_LABEL[activeTower]}에 쌓기`}
            />
          )}
          ListEmptyComponent={
            blocks.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
              : <EmptyState icon="musical-notes-outline" title="블록이 없어요" />
          }
        />

        {lastAdded && (
          <View style={[styles.toast, { marginBottom: insets.bottom + space.sm }]} accessibilityLiveRegion="polite">
            <Text style={styles.toastText} numberOfLines={1}>{lastAdded}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  done: { minHeight: 38, paddingVertical: 6 },
  towerSwitch: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  switchLabel: { color: colors.muted, fontSize: 13, marginRight: 4 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  list: { paddingHorizontal: space.lg, paddingBottom: 80 },
  toast: {
    position: 'absolute', bottom: 0, left: space.lg, right: space.lg, backgroundColor: colors.cardActive,
    borderRadius: 10, padding: space.md, borderWidth: 1, borderColor: colors.primary,
  },
  toastText: { color: colors.text, fontSize: 14 },
});
