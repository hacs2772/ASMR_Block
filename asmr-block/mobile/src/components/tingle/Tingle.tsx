import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { useTranslation } from 'react-i18next';

/** "팅글" 글자: 분홍 (반짝이 장식은 쓰지 않음) */
export function TingleWord(_props: { size?: number }) {
  const { t } = useTranslation();
  return <Text style={{ color: colors.primaryText }}>{t('tingle.word')}</Text>;
}

/** "팅글이 뭐예요?" 누르면 한 줄 설명 (처음 온 사람용) */
export function WhatIsTingle() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignSelf: 'flex-start', gap: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)}
        hitSlop={8} style={styles.whatBtn} testID="what-is-tingle">
        <Ionicons name={open ? 'chevron-up' : 'help-circle-outline'} size={14} color={colors.muted} />
        <Text style={styles.whatText}>{t('tingle.what')}</Text>
      </Pressable>
      {open && (
        <Text style={styles.whatBox}>
          {t('tingle.whatBody')}
        </Text>
      )}
    </View>
  );
}

/** 사전 tingle.words.{key} (word · body). 한국어 화면에서는 영어 이름도 작게 */
const WORDS: { key: string; en: string }[] = [
  { key: 'tingle', en: 'TINGLE' },
  { key: 'trigger', en: 'TRIGGER' },
  { key: 'layered', en: 'LAYERED' },
  { key: 'noTalking', en: 'NO TALKING' },
];

/** ASMR 단어장: 매니아 말 4개를 한 줄씩 */
export function Glossary() {
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.words}>
      {WORDS.map((w, i) => (
        <View key={w.key} style={[styles.word, i % 2 === 1 && styles.wordRight, i >= 2 && styles.wordBottom]}>
          <Text style={styles.wordTitle}>{t(`tingle.words.${w.key}.word`)}{i18n.language !== 'en' ? <Text style={styles.wordEn}> {w.en}</Text> : null}</Text>
          <Text style={styles.wordBody}>{t(`tingle.words.${w.key}.body`)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  whatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  whatText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  whatBox: {
    color: colors.text, fontSize: 13, lineHeight: 20, backgroundColor: colors.primarySoft,
    borderRadius: radius.md, padding: space.md, maxWidth: 420,
  },
  words: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  word: { width: '50%', paddingVertical: space.md, paddingRight: space.md },
  wordRight: { paddingLeft: space.md, borderLeftWidth: 1, borderLeftColor: colors.border },
  wordBottom: { borderTopWidth: 1, borderTopColor: colors.border },
  wordTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  wordEn: { color: colors.faint, fontSize: 9, fontWeight: '600', letterSpacing: 0.6 },
  wordBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
