import { Linking, StyleSheet, Text } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { colors } from '@/theme';

/** "○○하면 이용약관·개인정보 처리방침에 동의하는 거예요" (링크는 웹 페이지로) */
export function LegalNote({ action = '가입하면', extra }: { action?: string; extra?: string }) {
  return (
    <Text style={styles.note}>
      {action}{' '}
      <Text style={styles.link} onPress={() => void Linking.openURL(TERMS_URL)} accessibilityRole="link">이용약관</Text>
      {'과 '}
      <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityRole="link">개인정보 처리방침</Text>
      에 동의하는 거예요.{extra ? ` ${extra}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.faint, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  link: { color: colors.muted, textDecorationLine: 'underline' },
});
