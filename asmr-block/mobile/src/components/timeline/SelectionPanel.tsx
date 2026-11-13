import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '@/lib/format';
import { durationsOf, lengthOf, MAX_REPEAT, useEditor } from '@/store/editor';
import { colors, radius, space } from '@/theme';
import type { IconName } from '@/components/ui';

/** 선택한 블록 다루기: 반복, 복제, 끝까지 채우기, 트랙 옮기기, 빼기 */
export function SelectionPanel() {
  const editor = useEditor();
  const { selected } = editor;
  if (!selected) {
    return (
      <Text style={styles.hint}>
        블록을 누르면 반복·복제·삭제를 할 수 있어요{'\n'}꾹 눌러서 끌면 순서를 바꾸거나 믹스 트랙으로 옮길 수 있어요
      </Text>
    );
  }
  const items = selected.track === 'main' ? editor.main.items : editor.mix.items;
  const index = items.findIndex((i) => i.key === selected.key);
  const item = items[index];
  if (!item) return null;
  const isMix = selected.track === 'mix';
  const mainLength = durationsOf(editor).main;

  return (
    <View style={styles.panel} testID="selection-panel">
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: item.block.category?.color ?? colors.faint }]} />
        <Text style={styles.title} numberOfLines={1}>{item.block.title}</Text>
        <Text style={styles.meta}>
          {isMix ? `${formatDuration(item.start ?? 0)}부터 · ` : ''}1회 {formatDuration(item.block.duration)} · 총 {formatDuration(lengthOf(item))}
        </Text>
      </View>

      <View style={styles.repeatRow}>
        <Text style={styles.label}>반복</Text>
        <Step icon="remove" label="반복 줄이기" disabled={item.repeat <= 1} onPress={() => editor.setRepeat(item.key, item.repeat - 1)} />
        <Text style={styles.repeat} testID="repeat-count">×{item.repeat}</Text>
        <Step icon="add" label="반복 늘리기" disabled={item.repeat >= MAX_REPEAT} onPress={() => editor.setRepeat(item.key, item.repeat + 1)} />
        {[5, 10, 20].map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}번 반복`} onPress={() => editor.setRepeat(item.key, n)}
            style={[styles.quick, item.repeat === n && styles.quickActive]}>
            <Text style={styles.quickText}>×{n}</Text>
          </Pressable>
        ))}
        {isMix && mainLength > (item.start ?? 0) && (
          <Pressable accessibilityRole="button" accessibilityLabel="메인 끝까지 채우기" onPress={() => editor.fillToEnd(item.key)} style={styles.quick}>
            <Text style={styles.quickText}>끝까지</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.actions}>
        <Action icon="copy-outline" label="복제" onPress={() => editor.duplicate(item.key)} testID="action-duplicate" />
        {isMix ? (
          <Action icon="arrow-up-outline" label="메인으로" onPress={() => editor.moveToMain(item.key, editor.main.items.length)} />
        ) : (
          <Action icon="git-merge-outline" label="믹스로" onPress={() => editor.moveToMix(item.key, 0)} />
        )}
        {!isMix && <Action icon="chevron-back" label="앞으로" disabled={index === 0} onPress={() => editor.moveToMain(item.key, index - 1)} />}
        {!isMix && <Action icon="chevron-forward" label="뒤로" disabled={index === items.length - 1} onPress={() => editor.moveToMain(item.key, index + 1)} />}
        {isMix && <Action icon="play-back-outline" label="-10초" onPress={() => editor.moveToMix(item.key, Math.max(0, (item.start ?? 0) - 10))} />}
        {isMix && <Action icon="play-forward-outline" label="+10초" onPress={() => editor.moveToMix(item.key, (item.start ?? 0) + 10)} />}
        <Action icon="trash-outline" label="빼기" danger onPress={() => editor.remove(item.key)} testID="action-remove" />
      </View>
    </View>
  );
}

function Step({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
      style={[styles.step, disabled && { opacity: 0.35 }]} hitSlop={6}>
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

function Action({ icon, label, onPress, disabled, danger, testID }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean; testID?: string;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} testID={testID}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.cardActive }, disabled && { opacity: 0.35 }]}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.actionText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.faint, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingVertical: space.md },
  panel: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 3 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  label: { color: colors.muted, fontSize: 12, marginRight: 2 },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  repeat: { color: colors.text, fontSize: 16, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  quick: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  quickActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.bg },
  actionText: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
