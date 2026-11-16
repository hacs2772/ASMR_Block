import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '@/audio/PlayerProvider';
import { Button, EmptyState } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '@/locales/LanguageSwitch';
import { WalletCard } from '@/components/coin/WalletCard';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { status, user, logout, deleteAccount } = useAuth();
  const player = usePlayer();

  const handleLogout = async () => {
    player.stop();
    await logout();
  };

  const handleDelete = async () => {
    const ok = await confirm(t('profile.leaveTitle'), t('profile.leaveConfirm'), t('profile.leaveOk'), true);
    if (!ok) return;
    try {
      player.stop();
      await deleteAccount();
      notify(t('profile.left'));
    } catch (e) {
      notify(t('profile.leaveFailed'), (e as Error).message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {status === 'signedIn' && user ? (
        <View style={styles.card}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.role === 'ADMIN' && <Text style={styles.badge}>{t('profile.admin')}</Text>}
        </View>
      ) : (
        <EmptyState icon="person-circle-outline" title={t('profile.loginPrompt')}>
          <Button title={t('profile.login')} onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
          <Button title={t('profile.signup')} variant="secondary" onPress={() => router.push('/signup')} style={{ alignSelf: 'stretch' }} />
        </EmptyState>
      )}

      {status === 'signedIn' && <WalletCard />}

      {status === 'signedIn' && (
        <View style={styles.actions}>
          <Button title={t('profile.logout')} variant="secondary" onPress={handleLogout} />
          <Button title={t('profile.leave')} variant="danger" onPress={handleDelete} />
        </View>
      )}

      <View style={styles.info} testID="language-card">
        <LanguageSwitch />
      </View>

      <View style={styles.info}>
        <Text style={styles.infoLabel}>{t('profile.server')}</Text>
        <Text style={styles.infoValue} selectable>{API_URL}</Text>
        <Text style={styles.infoHint}>{t('profile.serverHint')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  nickname: { color: colors.text, fontSize: 20, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 14 },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  actions: { gap: space.sm },
  info: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, gap: 4 },
  infoLabel: { color: colors.muted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 13 },
  infoHint: { color: colors.faint, fontSize: 12, lineHeight: 18 },
});
