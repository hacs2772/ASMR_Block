import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 화면 오른쪽 위: 알림(로그인했을 때) + ? 도움말(팅글 설명·단어장) + 내 정보 */
export function HeaderActions() {
  const { t } = useTranslation();
  const signedIn = useAuth((s) => s.status === 'signedIn');
  return (
    <View style={styles.row}>
      <NotificationBell />
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.help')} hitSlop={8} onPress={() => router.push('/help')}
        style={styles.btn} testID="open-help">
        <Ionicons name="help-circle-outline" size={24} color={colors.muted} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.profile')} hitSlop={8} onPress={() => router.push('/profile')}
        style={styles.btn} testID="open-profile">
        <Ionicons name={signedIn ? 'person-circle' : 'person-circle-outline'} size={26} color={signedIn ? colors.primaryText : colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 12 },
  btn: { padding: 2 },
});
