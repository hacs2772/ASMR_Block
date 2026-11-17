import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

export type EnglishText = { titleEn: string; recordedPlaceEn: string; descriptionEn: string };
export const EMPTY_ENGLISH: EnglishText = { titleEn: '', recordedPlaceEn: '', descriptionEn: '' };

/** 영어로도 적기 (선택, 접힘): 영어 화면에 보이는 제목·녹음한 곳·한 줄 소개 — 올리기·고치기 같이 씀 (웹 EnglishFields와 같은 칸) */
export function EnglishFields({ value, onChange, initiallyOpen = false }: {
  value: EnglishText; onChange: (next: EnglishText) => void; initiallyOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initiallyOpen);
  const field = (key: keyof EnglishText, label: string, ph: string, max: number) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value[key]} onChangeText={(v) => onChange({ ...value, [key]: v })} maxLength={max}
        placeholder={ph} placeholderTextColor={colors.faint} accessibilityLabel={label} autoCapitalize="sentences" testID={`en-${key}`} />
    </View>
  );
  return (
    <View style={styles.box}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.head} testID="en-fields">
        <Text style={styles.title}>{t('upload.enTitle')}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={{ gap: space.sm }}>
          <Text style={styles.hint}>{t('upload.enHint')}</Text>
          {field('titleEn', t('upload.enName'), t('upload.enNamePh'), 60)}
          {field('recordedPlaceEn', t('upload.enPlace'), t('upload.enPlacePh'), 60)}
          {field('descriptionEn', t('upload.enNote'), t('upload.enNotePh'), 120)}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, gap: space.sm, marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.faint, fontSize: 12, lineHeight: 17 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: { color: colors.text, fontSize: 15, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
});
