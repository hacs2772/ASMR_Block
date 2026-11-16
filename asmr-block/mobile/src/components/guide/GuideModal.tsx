import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GuideStep } from '@/lib/guide';
import { colors, radius, space } from '@/theme';
import { Button } from '@/components/ui';
import { GuideArt } from './GuideArt';
import { useTranslation } from 'react-i18next';

type Props = { visible: boolean; steps: GuideStep[]; onClose: () => void; finishLabel?: string };

/** 사용법 팝업: 움직이는 그림 + 한 줄 설명, 점으로 몇 번째인지, 건너뛰기·다음 */
export function GuideModal({ visible, steps, onClose, finishLabel }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  // 닫을 때 처음 장으로 돌려 둠 (다시 열면 1장부터)
  const finish = () => { setIndex(0); onClose(); };
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  if (!step) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: Math.min(380, width - space.lg * 2) }]} testID="guide-modal">
          <View style={styles.artWrap}><GuideArt key={`${step.art}-${index}`} kind={step.art} /></View>
          <Text style={styles.count}>{index + 1} / {steps.length}</Text>
          <Text style={styles.title} testID="guide-title">{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <Pressable key={s.title} onPress={() => setIndex(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('guideModal.nth', { n: i + 1 })}>
                <View style={[styles.dot, i === index && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            {last ? <View style={{ flex: 1 }} /> : (
              <Button title={t('guideModal.skip')} variant="ghost" onPress={finish} style={{ flex: 1 }} testID="guide-skip" />
            )}
            <Button title={last ? finishLabel ?? t('guideModal.finishWelcome') : t('guideModal.next')} onPress={() => (last ? finish() : setIndex(index + 1))}
              style={{ flex: 1 }} testID="guide-next" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm },
  artWrap: { backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: space.md, marginBottom: space.xs },
  count: { color: colors.primaryText, fontSize: 12, fontWeight: '800' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21, minHeight: 63 }, // 장마다 버튼이 들썩이지 않게 (세 줄)
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: space.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotOn: { width: 20, backgroundColor: colors.primary },
  row: { flexDirection: 'row', gap: space.sm },
});
