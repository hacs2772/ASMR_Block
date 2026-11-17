import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Brick } from '@/components/editor/Brick';
import { Button } from '@/components/ui';
import { RECORDING_CHECKLIST, RECORDING_DONTS, RECORDING_SECTIONS, type RecordingSection } from '@/lib/recording';
import { colors, plate, radius, space, triggerColor, fonts } from '@/theme';
import { useTranslation } from 'react-i18next';
import { RECORDING_CHECKLIST_EN, RECORDING_DONTS_EN, RECORDING_SECTIONS_EN } from '@/lib/recording.en';

const SECTION_ICON: Record<RecordingSection['key'], keyof typeof Ionicons.glyphMap> = {
  what: 'locate', room: 'moon', mic: 'phone-portrait-outline', record: 'mic', check: 'headset',
};

/** 지금 언어의 녹음 가이드 내용 (영어는 lib/recording.en.ts) */
function useRecording() {
  const { i18n } = useTranslation();
  return i18n.language === 'en'
    ? { checklist: RECORDING_CHECKLIST_EN, sections: RECORDING_SECTIONS_EN, donts: RECORDING_DONTS_EN }
    : { checklist: RECORDING_CHECKLIST, sections: RECORDING_SECTIONS, donts: RECORDING_DONTS };
}

/** 녹음 가이드 (블록 판매 → 녹음 가이드): 휴대폰 하나로 듣기 좋은 블록 녹음하는 법. 웹 /sell/guide와 같은 내용 */
export default function RecordingGuideScreen() {
  const { t } = useTranslation();
  const { sections, donts } = useRecording();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.headline}>{t('rec.headline')}</Text>
      <Text style={styles.lead}>{t('rec.lead')}</Text>

      <Checklist />

      {sections.map((s, i) => (
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
          <Text style={styles.cardTitle}>{t('rec.dontsTitle')}</Text>
        </View>
        {donts.map((d) => (
          <View key={d} style={styles.point}>
            <View style={[styles.dot, { backgroundColor: colors.warn }]} />
            <Text style={[styles.pointText, { color: colors.text }]}>{d}</Text>
          </View>
        ))}
        <Text style={styles.note}>{t('rec.dontsNote')}</Text>
      </View>

      <Text style={styles.end}>{t('rec.endBody')}</Text>
      <Button title={t('rec.go')} icon="cloud-upload-outline" onPress={() => router.navigate('/upload')} testID="rec-go-sell" />
    </ScrollView>
  );
}

/** 녹음 버튼 누르기 전 체크 (이 화면에서만, 저장하지 않음) */
function Checklist() {
  const { t } = useTranslation();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const { checklist } = useRecording();
  const count = checklist.filter((c) => done[c.key]).length;
  const all = count === checklist.length;
  return (
    <View style={styles.card} testID="rec-checklist">
      <View style={[styles.cardHead, { justifyContent: 'space-between' }]}>
        <Text style={styles.cardTitle}>{t('rec.checkTitle')}</Text>
        <Text style={[styles.count, all && { color: colors.primaryText }]} testID="rec-check-count">
          {all ? t('rec.ready') : `${count}/${checklist.length}`}
        </Text>
      </View>
      {checklist.map((c) => {
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
      {all ? <Text style={styles.ready}>{t('rec.readyMsg')}</Text> : null}
    </View>
  );
}

/** 좁으면 "·"에서만 줄바꿈 (영어 "15–20 cm"가 갈라지지 않게 — 띄어쓰기·대시 뒤에 줄바꿈 금지 글자) */
const keepTogether = (text: string) => text.split(' · ').map((part) => part.replace(/ /g, '\u00A0').replace(/–/g, '–\u2060')).join(' · ');

/** 휴대폰 마이크와 소리 사이 "한 뼘" 그림 */
function MicDistance() {
  const { t } = useTranslation();
  return (
    <View style={styles.diagram} accessibilityLabel={t('rec.diagramA11y')}>
      <View style={styles.phoneWrap}>
        <View style={styles.phone}><View style={styles.mic} /></View>
        <Text style={styles.micLabel}>{t('rec.mic')}</Text>
      </View>
      <View style={styles.ruler}>
        <Text style={styles.rulerText}>{keepTogether(t('rec.distance'))}</Text>
        <View style={styles.rulerLine}>
          <View style={styles.tick} /><View style={styles.line} /><View style={styles.tick} />
        </View>
      </View>
      <View style={{ alignItems: 'center' }}>
        <Brick color={triggerColor.tap} width={84} height={34} icon="finger-print" title={t('rec.tap')} minutes={3} />
        <Text style={styles.micLabel}>{t('rec.source')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 40, gap: space.md },
  headline: { color: colors.text, fontSize: 24, fontFamily: fonts.display },
  lead: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  card: { ...plate, padding: space.md, gap: space.sm },
  donts: { borderColor: 'rgba(233, 188, 85, 0.4)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 2 },
  cardIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: colors.text, fontSize: 18, flexShrink: 1, fontFamily: fonts.display },
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
