import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { hiddenApi } from '@/api/endpoints';
import { Button } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { useHidden } from '@/store/hidden';
import { colors, radius, space } from '@/theme';

/**
 * 내 정보: 숨긴 크리에이터 (V20) — @닉네임(누르면 크리에이터 페이지) + 다시 보기. 아무도 안 숨겼으면 안 보임
 * (웹 components/profile/HiddenCreators.jsx와 같음). 쿼리 키 ['hidden-creators']
 */
export function HiddenCreators() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const removeHidden = useHidden((s) => s.remove);
  const query = useQuery({ queryKey: ['hidden-creators'], queryFn: hiddenApi.list });
  const list = query.data ?? [];

  const unhide = async (id: number) => {
    try {
      await hiddenApi.unhide(id);
      removeHidden(id);
      notify(t('hide.undone'));
      await queryClient.invalidateQueries();
    } catch (e) {
      notify(t('hide.failed'), (e as Error).message);
    }
  };

  if (list.length === 0) return null;
  return (
    <View style={styles.card} testID="hidden-creators">
      <View style={styles.head}>
        <Text style={styles.title}>{t('hide.listTitle')}</Text>
      </View>
      <Text style={styles.note}>{t('hide.listNote')}</Text>
      {list.map((c) => (
        <View key={c.id} style={styles.row}>
          <Pressable accessibilityRole="link" style={{ flex: 1, minWidth: 0 }}
            onPress={() => router.push({ pathname: '/creator/[id]', params: { id: String(c.id) } })}>
            <Text style={styles.name} numberOfLines={1}>@{c.nickname}</Text>
          </Pressable>
          <Button title={t('hide.unhide')} variant="secondary" onPress={() => void unhide(c.id)} testID={`unhide-${c.id}`} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
