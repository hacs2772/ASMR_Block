import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { notificationApi } from '@/api/endpoints';
import type { NotificationItem, NotificationSettings, NotificationType } from '@/api/types';
import { BlockLoader } from '@/components/BlockLoader';
import { NOTIFICATION_SUMMARY_KEY, useNotificationSummary } from '@/components/NotificationBell';
import { EmptyState } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { ago } from '@/lib/time';
import { useAuth } from '@/store/auth';
import { colors, plate, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';
import { notificationText } from '@/lib/notifications';

const ICON: Record<NotificationType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  BLOCK_APPROVED: { name: 'checkmark-circle', color: colors.success },
  BLOCK_REJECTED: { name: 'return-down-back', color: colors.warn },
  BLOCK_COLLECTED: { name: 'cube', color: colors.primaryText },
  COMBO_COLLECTED: { name: 'layers', color: colors.primaryText },
};

/**
 * 알림 화면 (머리 오른쪽 종): 검수 결과(승인·돌려보냄) · 내 블록·조합을 담은 소식.
 * 열면 모두 읽음으로. 맨 위에서 종류별로 끌 수 있음 (끄면 아예 만들지 않음)
 */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const me = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const summary = useNotificationSummary();
  const list = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => notificationApi.list(0) });
  const marked = useRef(false);

  // 처음 보여 준 뒤 모두 읽음 (이번 화면에서는 새 알림 표시가 그대로 남음)
  useEffect(() => {
    if (marked.current || !list.data || !summary.data?.unread) return;
    marked.current = true;
    notificationApi.read().then((s) => queryClient.setQueryData(NOTIFICATION_SUMMARY_KEY, s)).catch(() => {});
  }, [list.data, summary.data?.unread, queryClient]);

  const settings = useMutation({
    mutationFn: (next: NotificationSettings) => notificationApi.settings(next),
    onSuccess: (s) => queryClient.setQueryData(NOTIFICATION_SUMMARY_KEY, s),
    onError: (e) => notify(t('notif.changeFailed'), (e as Error).message),
  });

  const open = (n: NotificationItem) => {
    const target = n.target;
    if (!target) return;
    if (target.kind === 'BLOCK' && me) router.push({ pathname: '/creator/[id]', params: { id: String(me.id), block: String(target.id) } });
    else if (target.kind === 'UPLOADS') router.navigate('/upload');
    else if (target.kind === 'COMBO' && target.id) router.push({ pathname: '/player/[id]', params: { id: String(target.id) } });
  };

  const s = summary.data?.settings;
  const allOff = s ? !s.review && !s.collect : false;
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={list.data?.content ?? []}
      keyExtractor={(n) => String(n.id)}
      refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.muted} />}
      ListHeaderComponent={s ? (
        <View style={styles.settings} testID="notif-settings">
          <Text style={styles.settingsTitle}>{allOff ? t('notif.offAll') : t('notif.settingsTitle')}</Text>
          <SettingRow title={t('notif.review')} hint={t('notif.reviewHint')} value={s.review}
            onChange={(v) => settings.mutate({ ...s, review: v })} testID="notif-toggle-review" />
          <SettingRow title={t('notif.collect')} hint={t('notif.collectHint')} value={s.collect}
            onChange={(v) => settings.mutate({ ...s, collect: v })} testID="notif-toggle-collect" />
        </View>
      ) : undefined}
      renderItem={({ item: n }) => {
        const icon = ICON[n.type];
        return (
          <Pressable accessibilityRole="button" onPress={() => open(n)} disabled={!n.target}
            style={({ pressed }) => [styles.item, !n.read && styles.unread, pressed && { opacity: 0.8 }]} testID={`notif-${n.id}`}>
            <Ionicons name={icon.name} size={19} color={icon.color} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.message}>{notificationText(n)}</Text>
              {n.note ? <Text style={styles.note}>{t('notif.reason', { note: n.note })}</Text> : null}
              <Text style={styles.time}>{ago(n.at, undefined, i18n.language)}</Text>
            </View>
            {!n.read ? <View style={styles.dot} accessibilityLabel={t('notif.new')} /> : null}
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      ListEmptyComponent={list.isLoading ? <BlockLoader style={{ marginTop: space.lg }} /> : (
        <EmptyState icon="notifications-outline" title={t('notif.emptyTitle')}
          message={t('notif.emptyBody')} />
      )}
    />
  );
}

function SettingRow({ title, hint, value, onChange, testID }: {
  title: string; hint: string; value: boolean; onChange: (v: boolean) => void; testID: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white}
        accessibilityLabel={t('notif.switchA11y', { title })} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 40 },
  settings: { ...plate, padding: space.md, gap: space.sm, marginBottom: space.lg },
  settingsTitle: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rowHint: { color: colors.faint, fontSize: 12, marginTop: 1 },
  item: {
    flexDirection: 'row', gap: space.md, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: space.md,
  },
  unread: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  time: { color: colors.faint, fontSize: 11, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
