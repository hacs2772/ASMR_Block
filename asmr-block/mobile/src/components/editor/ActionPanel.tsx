import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreview } from '@/audio/usePreview';
import { usePreviewClock } from '@/audio/useMixPreview';
import type { IconName } from '@/components/ui';
import { formatDuration } from '@/lib/format';
import { mainLayout, NUDGE_SECONDS, useEditor } from '@/store/editor';
import { categoryFallbackColor, colors, radius, space } from '@/theme';

/** 고른 블록으로 할 일: 복제 · 듣기 · 옮기기(첫째 줄: 왼쪽/오른쪽, 둘째 줄: ±10초) · 빼기 */
export function ActionPanel() {
  const editor = useEditor();
  const preview = usePreview();
  const { selected } = editor;

  const mainIndex = selected?.row === 'main' ? editor.main.items.findIndex((i) => i.key === selected.key) : -1;
  const mixItem = selected?.row === 'mix' ? editor.mix.items.find((i) => i.key === selected.key) : undefined;
  const block = mainIndex >= 0 ? editor.main.items[mainIndex].block : mixItem?.block;

  if (!selected || !block) {
    return (
      <View style={styles.panel}>
        <Text style={styles.hint}>블록을 누르면 <Text style={styles.hintStrong}>복제·빼기</Text> · 꾹 눌러 끌면 <Text style={styles.hintStrong}>옮기기</Text></Text>
      </View>
    );
  }

  const from = mainIndex >= 0 ? mainLayout(editor.main.items)[mainIndex].start : mixItem!.start;
  const color = block.category?.color ?? categoryFallbackColor;

  return (
    <View style={styles.panel} testID="action-panel">
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.title} numberOfLines={1}>{block.title}</Text>
        <Text style={styles.time}>{formatDuration(from)} ~ {formatDuration(from + block.duration)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="선택 해제" onPress={() => editor.select(null)} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {!block.owned && <Text style={styles.warn}>내 블록함에 없는 블록이에요. 블록 상점에서 담아야 저장할 수 있어요.</Text>}
      <View style={styles.row}>
        <Action icon="copy-outline" label="복제" primary onPress={() => editor.duplicate(selected.key)} testID="action-duplicate" />
        <Action icon={preview.previewId === block.id ? 'pause' : 'play'} label="듣기" disabled={!block.fileUrl}
          onPress={() => { usePreviewClock.getState().stop(); preview.toggle(block); }} />
        {mainIndex >= 0 ? (
          <>
            <Action icon="chevron-back" label="왼쪽" disabled={mainIndex === 0} onPress={() => editor.moveMain(selected.key, mainIndex - 1)} />
            <Action icon="chevron-forward" label="오른쪽" disabled={mainIndex === editor.main.items.length - 1}
              onPress={() => editor.moveMain(selected.key, mainIndex + 1)} />
          </>
        ) : (
          <>
            <Action icon="chevron-back" label={`−${NUDGE_SECONDS}초`} disabled={from === 0} onPress={() => editor.nudge(selected.key, -NUDGE_SECONDS)} />
            <Action icon="chevron-forward" label={`+${NUDGE_SECONDS}초`} onPress={() => editor.nudge(selected.key, NUDGE_SECONDS)} />
          </>
        )}
        <Action icon="trash-outline" label="빼기" danger onPress={() => editor.remove(selected.key)} testID="action-remove" />
      </View>
    </View>
  );
}

function Action({ icon, label, onPress, primary, danger, disabled, testID }: {
  icon: IconName; label: string; onPress: () => void; primary?: boolean; danger?: boolean; disabled?: boolean; testID?: string;
}) {
  const color = primary ? '#fff' : danger ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} testID={testID}
      style={({ pressed }) => [styles.action, primary && styles.primary, (pressed || disabled) && { opacity: disabled ? 0.3 : 0.75 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  hintStrong: { color: colors.text, fontWeight: '600' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  time: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  close: { marginLeft: 'auto', padding: 2 },
  warn: { color: '#FCD34D', fontSize: 12 },
  row: { flexDirection: 'row', gap: 6 },
  action: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.cardActive },
  primary: { backgroundColor: colors.primary },
  actionText: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
