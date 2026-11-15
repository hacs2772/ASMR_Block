import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { feedbackApi } from '@/api/endpoints';
import { notify } from '@/lib/dialog';
import { colors, radius, space } from '@/theme';
import { Button } from './ui';

/** 의견 보내기 (도움말 화면). 로그인 없이도 보낼 수 있어요 */
export function FeedbackForm({ page = 'app/help' }: { page?: string }) {
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (message.trim().length < 2) {
      notify('의견을 조금만 더 적어 주세요');
      return;
    }
    setSending(true);
    try {
      await feedbackApi.send({ message: message.trim(), contact: contact.trim() || null, page });
      setMessage('');
      setContact('');
      setSent(true);
    } catch (e) {
      notify('보내지 못했어요', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.box} testID="feedback-form">
      <Text style={styles.title}>의견 보내기</Text>
      <Text style={styles.sub}>좋았던 점, 불편한 점, 있었으면 하는 소리… 편하게 적어 주세요. 꼭 읽어 볼게요.</Text>
      {sent ? <Text style={styles.thanks}>의견 고마워요! 또 생각나면 언제든 보내 주세요.</Text> : null}
      <TextInput style={[styles.input, styles.multi]} value={message} onChangeText={(t) => { setMessage(t); setSent(false); }}
        placeholder="예: 빗소리 블록이 더 많았으면 좋겠어요" placeholderTextColor={colors.faint} multiline maxLength={2000}
        textAlignVertical="top" testID="feedback-message" />
      <TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder="답장 받을 이메일 (선택)"
        placeholderTextColor={colors.faint} autoCapitalize="none" keyboardType="email-address" maxLength={100} testID="feedback-contact" />
      <Button title="보내기" icon="send" onPress={send} loading={sending} testID="feedback-send" />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  thanks: { color: colors.primaryText, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    color: colors.text, fontSize: 14, paddingHorizontal: space.md, paddingVertical: 10,
  },
  multi: { minHeight: 96 },
});
