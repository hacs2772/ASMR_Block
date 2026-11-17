import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { userApi } from '@/api/endpoints';
import { usePlayer } from '@/audio/PlayerProvider';
import { Button, EmptyState } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, plate, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';
import { LanguageSwitch } from '@/locales/LanguageSwitch';
import { WalletCard } from '@/components/coin/WalletCard';
import { SleepWeek } from '@/components/sleep/SleepWeek';
import { HiddenCreators } from '@/components/profile/HiddenCreators';

/**
 * 내 정보: 이름(닉네임 바꾸기) → 내 코인 → 최근 7일 잠 기록 → 언어 → 로그아웃 → 맨 아래 작은 "회원 탈퇴".
 * 연결된 서버 주소는 개발할 때만 (설치용 앱을 쓰는 사람에게는 필요 없는 정보)
 */
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
          <NicknameForm current={user.nickname} />
        </View>
      ) : (
        <EmptyState icon="person-circle-outline" title={t('profile.loginPrompt')}>
          <Button title={t('profile.login')} onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
          <Button title={t('profile.signup')} variant="secondary" onPress={() => router.push('/signup')} style={{ alignSelf: 'stretch' }} />
        </EmptyState>
      )}

      {status === 'signedIn' && <WalletCard />}
      {status === 'signedIn' && <SleepWeek />}
      {status === 'signedIn' && <HiddenCreators />}

      <View style={styles.info} testID="language-card">
        <LanguageSwitch />
      </View>

      {status === 'signedIn' && (
        <>
          <Button title={t('profile.logout')} variant="secondary" onPress={handleLogout} testID="logout" />
          <Pressable accessibilityRole="button" onPress={() => void handleDelete()} hitSlop={8} style={styles.leave} testID="leave">
            <Text style={styles.leaveText}>{t('profile.leave')}</Text>
          </Pressable>
        </>
      )}

      {__DEV__ && (
        <View style={styles.info}>
          <Text style={styles.infoLabel}>{t('profile.server')}</Text>
          <Text style={styles.infoValue} selectable>{API_URL}</Text>
          <Text style={styles.infoHint}>{t('profile.serverHint')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

/** 닉네임 바꾸기 (블록·조합에 @닉네임으로 보임, 2~20자) */
function NicknameForm({ current }: { current: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const changed = trimmed !== current && trimmed.length >= 2;

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    try {
      const u = await userApi.update({ nickname: trimmed });
      useAuth.setState({ user: u });
      notify(t('profile.nicknameSaved'));
    } catch (e) {
      notify(t('profile.nicknameFailed'), (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.nickRow}>
      <TextInput style={styles.input} value={value} onChangeText={setValue} maxLength={20}
        accessibilityLabel={t('profile.nickname')} placeholder={t('profile.nickname')} placeholderTextColor={colors.faint}
        returnKeyType="done" onSubmitEditing={() => void save()} testID="nickname-input" />
      <Button title={t('profile.nicknameSave')} variant="secondary" onPress={() => void save()} loading={saving}
        disabled={!changed} testID="nickname-save" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
  card: { ...plate, padding: space.lg, gap: 4 },
  nickname: { color: colors.text, fontSize: 20, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 14 },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  nickRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  input: {
    flex: 1, minWidth: 0, backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 14, paddingHorizontal: space.md, paddingVertical: 10,
  },
  leave: { alignSelf: 'center', paddingVertical: space.sm },
  leaveText: { color: colors.danger, fontSize: 13, textDecorationLine: 'underline' },
  info: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, gap: 4 },
  infoLabel: { color: colors.muted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 13 },
  infoHint: { color: colors.faint, fontSize: 12, lineHeight: 18 },
});
