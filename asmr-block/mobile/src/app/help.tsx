import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrickStack } from '@/components/Brand';
import { FeedbackForm } from '@/components/FeedbackForm';
import { GuideModal } from '@/components/guide/GuideModal';
import { guideSteps } from '@/lib/guide';
import { privacyUrl, termsUrl } from '@/lib/links';
import { Glossary, TingleWord } from '@/components/tingle/Tingle';
import { Button } from '@/components/ui';
import { colors, radius, space } from '@/theme';
import { Trans, useTranslation } from 'react-i18next';
import { LanguageSwitch } from '@/locales/LanguageSwitch';

/** 사전 help.steps.{key} (title · body) */
const STEPS = ['s1', 's2', 's3', 's4'];

/** 도움말 (오른쪽 위 ?): 처음 온 사람을 위한 팅글 설명 · 쓰는 법 · 단어장 */
export default function HelpScreen() {
  const { t } = useTranslation();
  const [tour, setTour] = useState(false);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.headline}><Trans i18nKey="help.headline" components={{ tingle: <TingleWord size={26} /> }} /></Text>
      <BrickStack />
      <Text style={styles.lead}>
        {t('help.lead')}
      </Text>

      <View style={styles.box}>
        <Text style={styles.boxTitle}>{t('tingle.what')}</Text>
        <Text style={styles.boxBody}>
          {t('tingle.whatBody')}
        </Text>
      </View>

      <Text style={styles.section}>{t('help.howTitle')}</Text>
      {STEPS.map((s, i) => (
        <View key={s} style={styles.step}>
          <Text style={styles.stepNo}>{i + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>{t(`help.steps.${s}.title`)}</Text>
            <Text style={styles.stepBody}>{t(`help.steps.${s}.body`)}</Text>
          </View>
        </View>
      ))}
      <Button title={t('help.replay')} variant="secondary" icon="play-circle-outline" onPress={() => setTour(true)} testID="guide-replay" />
      <Text style={styles.tip}>{t('help.tip')}</Text>

      <Text style={styles.section}>{t('help.glossary')}</Text>
      <Glossary />

      <Text style={styles.section}>{t('help.feedback')}</Text>
      <FeedbackForm />

      <LanguageSwitch />

      <View style={styles.legal}>
        <Text style={styles.legalLink} onPress={() => void Linking.openURL(termsUrl())} accessibilityRole="link">{t('legal.terms')}</Text>
        <Text style={styles.legalDot}>·</Text>
        <Text style={[styles.legalLink, { fontWeight: '700' }]} onPress={() => void Linking.openURL(privacyUrl())} accessibilityRole="link">
          {t('legal.privacy')}
        </Text>
      </View>

      <Button title={t('help.gotIt')} onPress={() => router.back()} style={{ marginTop: space.md }} />
      <GuideModal visible={tour} steps={guideSteps('full')} onClose={() => setTour(false)} finishLabel={t('help.gotIt')} />
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
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: space.md },
  legalLink: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  legalDot: { color: colors.faint, fontSize: 13 },
});
