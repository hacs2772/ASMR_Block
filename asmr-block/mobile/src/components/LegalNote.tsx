import { Trans } from 'react-i18next';
import { Linking, StyleSheet, Text } from 'react-native';
import { privacyUrl, termsUrl } from '@/lib/links';
import { colors } from '@/theme';

/** "가입하면(누르면) 이용약관·개인정보 처리방침에 동의하는 거예요" (링크는 웹 페이지로, 앱 언어 그대로) */
export function LegalNote({ kind = 'signup', extra }: { kind?: 'signup' | 'beta'; extra?: string }) {
  return (
    <Text style={styles.note}>
      <Trans i18nKey={kind === 'beta' ? 'legal.beta' : 'legal.signup'} components={{
        terms: <Text style={styles.link} onPress={() => void Linking.openURL(termsUrl())} accessibilityRole="link" />,
        privacy: <Text style={styles.link} onPress={() => void Linking.openURL(privacyUrl())} accessibilityRole="link" />,
      }} />
      {extra ? ` ${extra}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.faint, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  link: { color: colors.muted, textDecorationLine: 'underline' },
});
