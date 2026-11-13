import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '@/audio/PlayerProvider';
import { Button, EmptyState } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';

export default function ProfileScreen() {
  const { status, user, logout, deleteAccount } = useAuth();
  const player = usePlayer();

  const handleLogout = async () => {
    player.stop();
    await logout();
  };

  const handleDelete = async () => {
    const ok = await confirm('회원 탈퇴', '정말 탈퇴할까요? 내 조합이 모두 삭제되고 되돌릴 수 없어요.', '탈퇴', true);
    if (!ok) return;
    try {
      player.stop();
      await deleteAccount();
      notify('탈퇴 처리되었어요.');
    } catch (e) {
      notify('탈퇴하지 못했어요', (e as Error).message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {status === 'signedIn' && user ? (
        <View style={styles.card}>
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.role === 'ADMIN' && <Text style={styles.badge}>관리자</Text>}
        </View>
      ) : (
        <EmptyState icon="person-circle-outline" title="로그인하고 나만의 조합을 저장하세요">
          <Button title="로그인" onPress={() => router.push('/login')} style={{ marginTop: space.md, alignSelf: 'stretch' }} />
          <Button title="회원가입" variant="secondary" onPress={() => router.push('/signup')} style={{ alignSelf: 'stretch' }} />
        </EmptyState>
      )}

      {status === 'signedIn' && (
        <View style={styles.actions}>
          <Button title="로그아웃" variant="secondary" onPress={handleLogout} />
          <Button title="회원 탈퇴" variant="danger" onPress={handleDelete} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.infoLabel}>연결된 서버</Text>
        <Text style={styles.infoValue} selectable>{API_URL}</Text>
        <Text style={styles.infoHint}>연결이 안 되면 PC에서 서버가 켜져 있는지, 휴대폰과 PC가 같은 와이파이인지 확인하세요.</Text>
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
