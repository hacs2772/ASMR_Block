import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Brick } from '@/components/editor/Brick';
import { Button } from '@/components/ui';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS, type RecordingSection } from '@/lib/recording';
import { colors, radius, space, triggerColor } from '@/theme';

const SECTION_ICON: Record<RecordingSection['key'], keyof typeof Ionicons.glyphMap> = {
  what: 'locate', room: 'moon', mic: 'phone-portrait-outline', record: 'mic', check: 'headset',
};

/** 녹음 가이드 (블록 판매 → 녹음 가이드): 휴대폰 하나로 듣기 좋은 블록 녹음하는 법. 웹 /sell/guide와 같은 내용 */
export default function RecordingGuideScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.headline}>휴대폰 하나면 돼요</Text>
      <Text style={styles.lead}>조용한 곳에서, 한 뼘 거리로, 트리거 하나만 또렷하게. 이것만 지켜도 듣기 좋은 블록이 돼요.</Text>

      <Checklist />

      {RECORDING_SECTIONS.map((s, i) => (
        <View key={s.key} style={styles.card} testID={`rec-section-${s.key}`}>
          <View style={styles.cardHead}>
            <View style={styles.cardIcon}><Ionicons name={SECTION_ICON[s.key]} size={17} color={colors.primaryText} /></View>
            <Text style={styles.cardTitle}><Text style={{ color: colors.primaryText }}>{i + 1} </Text>{s.title}</Text>
          </View>
          {s.key === 'mic' ? <MicDistance /> : null}
          {s.points.map((p) => (
            <View key={p} style={styles.point}>
              <View style={styles.dot} />
              <Text style={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={[styles.card, styles.donts]} testID="rec-donts">
        <View style={styles.cardHead}>
          <Ionicons name="ban" size={18} color={colors.warn} />
          <Text style={styles.cardTitle}>이런 소리는 올릴 수 없어요</Text>
        </View>
        {RECORDING_DONTS.map((d) => (
          <View key={d} style={styles.point}>
            <View style={[styles.dot, { backgroundColor: colors.warn }]} />
            <Text style={[styles.pointText, { color: colors.text }]}>{d}</Text>
          </View>
        ))}
        <Text style={styles.note}>직접 녹음한 내 소리만 올려 주세요. 이런 소리는 검수에서 돌려보내고, 올라간 뒤라도 신고가 들어오면 내려갈 수 있어요.</Text>
      </View>

      <Text style={styles.end}>길게 녹음했어도 괜찮아요. 올릴 때 파형을 보며 좋은 부분만 골라요.</Text>
      <Button title="블록 올리러 가기" icon="cloud-upload-outline" onPress={() => router.navigate('/upload')} testID="rec-go-sell" />
    </ScrollView>
  );
}

/** 녹음 버튼 누르기 전 체크 (이 화면에서만, 저장하지 않음) */
function Checklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const count = RECORDING_CHECKLIST.filter((c) => done[c.key]).length;
  const all = count === RECORDING_CHECKLIST.length;
  return (
    <View style={styles.card} testID="rec-checklist">
      <View style={[styles.cardHead, { justifyContent: 'space-between' }]}>
        <Text style={styles.cardTitle}>녹음 버튼 누르기 전에</Text>
        <Text style={[styles.count, all && { color: colors.primaryText }]} testID="rec-check-count">
          {all ? '준비 끝!' : `${count}/${RECORDING_CHECKLIST.length}`}
        </Text>
      </View>
      {RECORDING_CHECKLIST.map((c) => {
        const on = !!done[c.key];
        return (
          <Pressable key={c.key} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
            onPress={() => setDone((d) => ({ ...d, [c.key]: !d[c.key] }))}
            style={[styles.check, on && styles.checkOn]} testID={`rec-check-${c.key}`}>
            <View style={[styles.box, on && styles.boxOn]}>
              {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
            </View>
            <Text style={[styles.checkText, on && styles.checkTextOn]}>{c.text}</Text>
          </Pressable>
        );
      })}
      {all ? <Text style={styles.ready}>좋아요, 이제 녹음을 시작하세요. 앞 5초는 조용히!</Text> : null}
    </View>
  );
}

/** 휴대폰 마이크와 소리 사이 "한 뼘" 그림 */
function MicDistance() {
  return (
    <View style={styles.diagram} accessibilityLabel="휴대폰 마이크를 소리 나는 곳에서 한 뼘, 15에서 20센티미터 거리에 둬요">
      <View style={styles.phoneWrap}>
        <View style={styles.phone}><View style={styles.mic} /></View>
        <Text style={styles.micLabel}>마이크</Text>
      </View>
      <View style={styles.ruler}>
        <Text style={styles.rulerText}>한 뼘 · 15~20cm</Text>
        <View style={styles.rulerLine}>
          <View style={styles.tick} /><View style={styles.line} /><View style={styles.tick} />
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Brick color={triggerColor.tap} width={84} height={34} icon="finger-print" title="탭핑" minutes={3} />
        <Text style={styles.micLabel}>소리 나는 곳</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 40, gap: space.md },
  headline: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  lead: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  donts: { borderColor: 'rgba(233, 188, 85, 0.4)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 2 },
  cardIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  count: { color: colors.faint, fontSize: 13, fontWeight: '700' },
  point: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 },
  pointText: { color: colors.muted, fontSize: 14, lineHeight: 21, flex: 1 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  end: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: space.sm },
  check: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11,
  },
  checkOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkText: { color: colors.muted, fontSize: 14, lineHeight: 20, flex: 1 },
  checkTextOn: { color: colors.text },
  ready: { color: colors.primaryText, fontSize: 13, fontWeight: '700', marginTop: 2 },
  diagram: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.sm,
    backgroundColor: colors.plate, borderRadius: radius.md, paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.md, marginVertical: 4,
  },
  phoneWrap: { alignItems: 'center' },
  phone: {
    width: 42, height: 80, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6,
  },
  mic: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  micLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 6 },
  ruler: { flex: 1, maxWidth: 140, alignItems: 'center', marginBottom: 26 },
  rulerText: { color: colors.text, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  rulerLine: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  tick: { width: 1, height: 10, backgroundColor: colors.muted },
  line: { flex: 1, height: 1, backgroundColor: colors.muted },
});
