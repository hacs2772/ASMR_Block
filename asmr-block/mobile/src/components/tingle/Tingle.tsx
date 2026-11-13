import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

/** "팅글" 글자: 분홍 + 작은 반짝임 */
export function TingleWord({ size }: { size: number }) {
  return (
    <Text style={{ color: colors.primaryText }}>
      팅글<Text style={{ fontSize: size * 0.42, color: colors.primary }}>✦</Text>
    </Text>
  );
}

/** "팅글이 뭐예요?" 누르면 한 줄 설명 (처음 온 사람용) */
export function WhatIsTingle() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignSelf: 'flex-start', gap: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)}
        hitSlop={8} style={styles.whatBtn} testID="what-is-tingle">
        <Ionicons name={open ? 'chevron-up' : 'help-circle-outline'} size={14} color={colors.muted} />
        <Text style={styles.whatText}>팅글이 뭐예요?</Text>
      </Pressable>
      {open && (
        <Text style={styles.whatBox}>
          ASMR을 들을 때 머리나 목덜미가 간질간질, 찌릿해지는 느낌이에요. 팅글이 오는 소리는 사람마다 달라서 직접 골라 쌓는 게 제일 잘 맞아요.
        </Text>
      )}
    </View>
  );
}

const WORDS: { word: string; en: string; body: string }[] = [
  { word: '팅글', en: 'TINGLE', body: '소리를 들을 때 오는 간질간질, 찌릿한 느낌' },
  { word: '트리거', en: 'TRIGGER', body: '팅글을 부르는 소리. 탭핑, 바스락, 귓속말 같은 것' },
  { word: '레이어드', en: 'LAYERED', body: '두 소리를 겹쳐 듣기. 둘째 줄에 깔면 돼요' },
  { word: '노토킹', en: 'NO TALKING', body: '말소리 없이 소리만 들어 있는 ASMR' },
];

/** ASMR 단어장: 매니아 말 4개를 한 줄씩 */
export function Glossary() {
  return (
    <View style={styles.words}>
      {WORDS.map((w, i) => (
        <View key={w.word} style={[styles.word, i % 2 === 1 && styles.wordRight, i >= 2 && styles.wordBottom]}>
          <Text style={styles.wordTitle}>{w.word} <Text style={styles.wordEn}>{w.en}</Text></Text>
          <Text style={styles.wordBody}>{w.body}</Text>
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
