import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { reportApi, type ReportReason, type ReportTargetType } from '@/api/endpoints';
import { notify } from '@/lib/dialog';
import { colors, radius, space } from '@/theme';
import { Button, Chip } from './ui';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'COPYRIGHT', label: '남의 소리·영상을 허락 없이 올렸어요' },
  { key: 'OFFENSIVE', label: '불쾌하거나 이상한 내용이 있어요' },
  { key: 'SPAM', label: '광고·도배예요' },
  { key: 'OTHER', label: '기타' },
];

const TYPE_LABEL: Record<ReportTargetType, string> = { BLOCK: '블록', PLAYLIST: '조합', USER: '사람' };

type Props = {
  visible: boolean;
  onClose: () => void;
  target: { type: ReportTargetType; id: number; title: string };
  /** 있으면 "올린 사람" 신고도 고를 수 있음 */
  owner?: { id: number; nickname: string } | null;
};

/** 신고하기 (블록·공개 조합·올린 사람). 로그인 없이도 보낼 수 있어요 */
export function ReportSheet({ visible, onClose, target, owner }: Props) {
  const [about, setAbout] = useState<'target' | 'owner'>('target');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);

  // 닫을 때 비워 둠 (다음에 열면 처음부터)
  const close = () => {
    setAbout('target');
    setReason(null);
    setDetail('');
    onClose();
  };

  const send = async () => {
    if (!reason) {
      notify('신고 이유를 골라 주세요');
      return;
    }
    const who = about === 'owner' && owner ? { targetType: 'USER' as const, targetId: owner.id } : { targetType: target.type, targetId: target.id };
    setSending(true);
    try {
      await reportApi.send({ ...who, reason, detail: detail.trim() || null });
      close();
      notify('신고를 받았어요', '관리자가 확인할게요. 신고한 사람은 상대에게 알려지지 않아요.');
    } catch (e) {
      notify('보내지 못했어요', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="닫기" />
        <View style={styles.card} testID="report-sheet">
          <ScrollView contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled">
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>신고하기</Text>
                <Text style={styles.sub} numberOfLines={1}>{TYPE_LABEL[target.type]} ‘{target.title}’</Text>
              </View>
              <Pressable onPress={close} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기" style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {owner ? (
              <View style={styles.row}>
                <Chip small label={`이 ${TYPE_LABEL[target.type]}`} active={about === 'target'} onPress={() => setAbout('target')} />
                <Chip small label={`올린 사람 @${owner.nickname}`} active={about === 'owner'} onPress={() => setAbout('owner')} testID="report-owner" />
              </View>
            ) : null}
            {REPORT_REASONS.map((r) => (
              <Pressable key={r.key} accessibilityRole="radio" accessibilityState={{ selected: reason === r.key }} onPress={() => setReason(r.key)}
                style={[styles.reason, reason === r.key && styles.reasonOn]} testID={`report-reason-${r.key}`}>
                <View style={[styles.radio, reason === r.key && styles.radioOn]}>
                  {reason === r.key ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.reasonText}>{r.label}</Text>
              </Pressable>
            ))}
            <TextInput style={styles.input} value={detail} onChangeText={setDetail} multiline maxLength={500} textAlignVertical="top"
              placeholder="자세히 적어 주시면 더 빨리 확인할 수 있어요 (선택)" placeholderTextColor={colors.faint} testID="report-detail" />
            <Button title="신고하기" icon="flag" onPress={() => void send()} loading={sending} testID="report-send" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** 작은 깃발 버튼 + 신고 창 */
export function ReportFlag({ target, owner, testID, size = 15 }: Omit<Props, 'visible' | 'onClose'> & { testID?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${target.title} 신고하기`}
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
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
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
