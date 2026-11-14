import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrickStack } from '@/components/Brand';
import { Glossary, TingleWord } from '@/components/tingle/Tingle';
import { Button } from '@/components/ui';
import { colors, radius, space } from '@/theme';

const STEPS = [
  { title: '블록 구매', body: '좋아하는 트리거(탭핑·바스락·귓속말…) 블록을 담아요. 무료 블록은 바로, 유료는 30초 맛보기.' },
  { title: '블록 편집', body: '담은 블록을 눌러 딸깍 이어 붙여요. 꾹 눌러 끌면 원하는 자리로, 레이어드로 두 소리를 겹쳐요.' },
  { title: '얼마나 들을까요?', body: '30분~8시간 중 고르고 저장하면, 끊김 없는 완성본이 만들어져요.' },
  { title: '홈에서 바로 듣기', body: '만든 조합은 홈 맨 위에 있어요. 눌러서 바로 들으면 돼요.' },
];

/** 도움말 (오른쪽 위 ?): 처음 온 사람을 위한 팅글 설명 · 쓰는 법 · 단어장 */
export default function HelpScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.headline}>나만의 <TingleWord size={26} />을{'\n'}블록으로 쌓아 보세요</Text>
      <BrickStack />
      <Text style={styles.lead}>
        소리 하나가 블록 하나. 탭핑 3분, 바스락 3분, 귓속말 3분처럼 좋아하는 트리거 블록만 골라 딸깍 이어 붙이면 나한테 딱 맞는 ASMR이 돼요.
      </Text>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>팅글이 뭐예요?</Text>
        <Text style={styles.boxBody}>
          ASMR을 들을 때 머리나 목덜미가 간질간질, 찌릿해지는 느낌이에요. 팅글이 오는 소리는 사람마다 달라서 직접 골라 쌓는 게 제일 잘 맞아요.
        </Text>
      </View>

      <Text style={styles.section}>이렇게 써요</Text>
      {STEPS.map((s, i) => (
        <View key={s.title} style={styles.step}>
          <Text style={styles.stepNo}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.tip}>★ 추천 조합에서는 다른 사람이 쌓은 조합을 들어 보고, 마음에 들면 한 번에 담을 수 있어요.</Text>

      <Text style={styles.section}>ASMR 단어장</Text>
      <Glossary />

      <Button title="알겠어요" onPress={() => router.back()} style={{ marginTop: space.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  headline: { color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 34, letterSpacing: -0.5 },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  box: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.md, gap: 4 },
  boxTitle: { color: colors.primaryText, fontSize: 14, fontWeight: '800' },
  boxBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  section: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: space.lg },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNo: {
    width: 26, height: 26, borderRadius: 6, textAlign: 'center', lineHeight: 26, overflow: 'hidden',
    color: colors.bg, backgroundColor: colors.primary, fontWeight: '800', fontSize: 14,
  },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  tip: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
