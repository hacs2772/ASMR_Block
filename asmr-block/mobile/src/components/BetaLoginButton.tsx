import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { authApi } from '@/api/endpoints';
import { LegalNote } from '@/components/LegalNote';
import { notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/**
 * 베타 기간에만 보이는 "베타로 바로 시작" (가입 없이 손님 계정으로 바로 로그인, 무료 블록 몇 개를 미리 담아 줌).
 * 서버 설정 app.beta.quick-login=false 가 되면 저절로 사라짐
 */
export function BetaLoginButton({ onDone, style }: { onDone?: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  const status = useQuery({ queryKey: ['beta-status'], queryFn: authApi.betaStatus, staleTime: 10 * 60_000, retry: false });
  const betaLogin = useAuth((s) => s.betaLogin);
  const [busy, setBusy] = useState(false);
  if (!status.data?.quickLogin) return null;

  const start = async () => {
    setBusy(true);
    try {
      await betaLogin();
      onDone?.();
    } catch (e) {
      notify(t('beta.failed'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <Pressable accessibilityRole="button" onPress={start} disabled={busy} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        testID="beta-login">
        {busy ? <ActivityIndicator color={colors.primaryText} /> : <Ionicons name="flash" size={18} color={colors.primaryText} />}
        <Text style={styles.text}>{t('beta.button')} <Text style={styles.sub}>{t('beta.noSignup')}</Text></Text>
      </Pressable>
      <Text style={styles.note}>{t('beta.note')}</Text>
      <LegalNote kind="beta" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, alignSelf: 'stretch' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14,
    borderRadius: radius.md, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft,
  },
  text: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '600' },
  note: { color: colors.faint, fontSize: 11, textAlign: 'center', paddingHorizontal: space.sm },
});
