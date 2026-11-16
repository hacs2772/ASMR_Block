import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, space } from '@/theme';
import { LANGS } from '.';

/** 언어 고르기 (한국어 · English): 이 기기에 기억 + 로그인했으면 계정에도 (웹 locales/LanguageSwitch.jsx와 같음) */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const changeLanguage = useAuth((s) => s.changeLanguage);
  const current = i18n.language === 'en' ? 'en' : 'ko';
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={t('lang.label')}>
      <Ionicons name="globe-outline" size={16} color={colors.muted} />
      <Text style={styles.label}>{t('lang.label')}</Text>
      {LANGS.map((l) => (
        <Chip key={l.code} small label={l.label} active={current === l.code} onPress={() => void changeLanguage(l.code)} testID={`lang-${l.code}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  label: { color: colors.muted, fontSize: 13, marginRight: 2 },
});
