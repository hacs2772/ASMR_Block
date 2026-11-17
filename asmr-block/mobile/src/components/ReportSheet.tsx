import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { hiddenApi, reportApi, type ReportReason, type ReportTargetType } from '@/api/endpoints';
import { confirm, notify } from '@/lib/dialog';
import { useAuth } from '@/store/auth';
import { useHidden } from '@/store/hidden';
import { colors, radius, space, fonts } from '@/theme';
import { Button, Chip } from './ui';
import { useTranslation } from 'react-i18next';

/** 이유 이름 = 사전 report.reason.{key} */
export const REPORT_REASONS: { key: ReportReason }[] = [
  { key: 'COPYRIGHT' },
  { key: 'OFFENSIVE' },
  { key: 'SPAM' },
  { key: 'OTHER' },
];


type Props = {
  visible: boolean;
  onClose: () => void;
  target: { type: ReportTargetType; id: number; title: string };
  /** 있으면 "올린 사람" 신고도 고를 수 있음 */
  owner?: { id: number; nickname: string } | null;
};

/** 신고하기 (블록·공개 조합·올린 사람). 로그인 없이도 보낼 수 있어요. 로그인했으면 보낸 뒤 그 크리에이터를 숨길지 물어봄 */
export function ReportSheet({ visible, onClose, target, owner }: Props) {
  const { t } = useTranslation();
  const [about, setAbout] = useState<'target' | 'owner'>('target');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const me = useAuth((s) => s.user);
  const addHidden = useHidden((s) => s.add);
  const queryClient = useQueryClient();

  // 닫을 때 비워 둠 (다음에 열면 처음부터)
  const close = () => {
    setAbout('target');
    setReason(null);
    setDetail('');
    onClose();
  };

  const send = async () => {
    if (!reason) {
      notify(t('report.pickReason'));
      return;
    }
    const who = about === 'owner' && owner ? { targetType: 'USER' as const, targetId: owner.id } : { targetType: target.type, targetId: target.id };
    setSending(true);
    try {
      await reportApi.send({ ...who, reason, detail: detail.trim() || null });
      close();
      // 로그인한 사람이 남의 것을 신고했으면 "이 크리에이터도 숨길까요?" (스토어 심사: 사용자 차단, V20)
      if (owner && me && owner.id !== me.id) {
        // "@"와 닉네임 사이에서 줄이 바뀌지 않게 (보이지 않는 글자 이음표)
        const nickname = `\u2060${owner.nickname}`;
        const yes = await confirm(t('hide.reported'), t('hide.askAfterReport', { nickname }), t('hide.hideOwner', { nickname }));
        if (yes) {
          await hiddenApi.hide(owner.id);
          addHidden(owner.id);
          void queryClient.invalidateQueries();
          notify(t('hide.done'));
        }
      } else {
        notify(t('report.received'), t('report.receivedBody'));
      }
    } catch (e) {
      notify(t('report.sendFailed'), (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={t('common.close')} />
        <View style={styles.card} testID="report-sheet">
          <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{t('report.title')}</Text>
                <Text style={styles.sub} numberOfLines={1}>{t(`report.typeCap.${target.type}`)} ‘{target.title}’</Text>
              </View>
              <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {owner ? (
              <View style={styles.row}>
                <Chip small label={t(`report.thisTarget.${target.type}`)} active={about === 'target'} onPress={() => setAbout('target')} />
                <Chip small label={t('report.owner', { nickname: owner.nickname })} active={about === 'owner'} onPress={() => setAbout('owner')} testID="report-owner" />
              </View>
            ) : null}
            {REPORT_REASONS.map((r) => (
              <Pressable key={r.key} accessibilityRole="radio" accessibilityState={{ selected: reason === r.key }} onPress={() => setReason(r.key)}
                style={[styles.reason, reason === r.key && styles.reasonOn]} testID={`report-reason-${r.key}`}>
                <View style={[styles.radio, reason === r.key && styles.radioOn]}>
                  {reason === r.key ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.reasonText}>{t(`report.reason.${r.key}`)}</Text>
              </Pressable>
            ))}
            <TextInput style={styles.input} value={detail} onChangeText={setDetail} multiline maxLength={500} textAlignVertical="top"
              placeholder={t('report.detail')} placeholderTextColor={colors.faint} testID="report-detail" />
            <Button title={t('report.title')} icon="flag" onPress={() => void send()} loading={sending} testID="report-send" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** 작은 깃발 버튼 + 신고 창 */
export function ReportFlag({ target, owner, testID, size = 15 }: Omit<Props, 'visible' | 'onClose'> & { testID?: string; size?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('report.reportThis', { title: target.title })}
        testID={testID} style={{ padding: 2 }}>
        <Ionicons name="flag-outline" size={size} color={colors.faint} />
      </Pressable>
      <ReportSheet visible={open} onClose={() => setOpen(false)} target={target} owner={owner} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: space.lg },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: space.md, maxHeight: '90%',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { color: colors.text, fontSize: 19, fontFamily: fonts.display },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  reason: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12,
  },
  reasonOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  reasonText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: 72,
    color: colors.text, fontSize: 14, paddingHorizontal: space.md, paddingVertical: 10,
  },
});
