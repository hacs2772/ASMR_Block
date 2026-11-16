import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { notificationApi } from '@/api/endpoints';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';
import { useTranslation } from 'react-i18next';

export const NOTIFICATION_SUMMARY_KEY = ['notifications', 'summary'] as const;

/** 안 읽은 알림 수 + 알림 설정 (로그인했을 때만, 1분마다) */
export function useNotificationSummary() {
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return useQuery({
    queryKey: NOTIFICATION_SUMMARY_KEY,
    queryFn: notificationApi.summary,
    enabled: signedIn,
    refetchInterval: 60_000,
  });
}

/** 머리 오른쪽 종 아이콘 (안 읽은 수 배지) → 알림 화면 */
export function NotificationBell() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const summary = useNotificationSummary();
  if (!signedIn) return null;
  const unread = summary.data?.unread ?? 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={unread > 0 ? t('common.notifNew', { count: unread }) : t('common.notifications')} hitSlop={8}
      onPress={() => router.push('/notifications')} style={styles.btn} testID="open-notifications">
      <Ionicons name={unread > 0 ? 'notifications' : 'notifications-outline'} size={23} color={unread > 0 ? colors.primaryText : colors.muted} />
      {unread > 0 ? (
        <View style={styles.badge} testID="notif-count"><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 },
  badge: {
    position: 'absolute', right: -4, top: -2, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
});
