import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 블록 판매 화면의 "녹음 가이드" 바로가기 */
export function RecordingGuideLink({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('recLink.a11y')} onPress={() => router.push('/recording-guide')}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardActive }, style]} testID="upload-recording-guide">
      <View style={styles.icon}><Ionicons name="mic" size={18} color={colors.primaryText} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('recLink.title')}</Text>
        <Text style={styles.body}>{t('recLink.body')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md,
  },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
