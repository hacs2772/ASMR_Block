import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { feedbackApi } from '@/api/endpoints';
import { notify } from '@/lib/dialog';
import { colors, radius, space } from '@/theme';
import { Button } from './ui';
import { useTranslation } from 'react-i18next';

/** 의견 보내기 (도움말 화면). 로그인 없이도 보낼 수 있어요 */
export function FeedbackForm({ page = 'app/help' }: { page?: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (message.trim().length < 2) {
      notify(t('feedback.tooShort'));
      return;
    }
    setSending(true);
    try {
      await feedbackApi.send({ message: message.trim(), contact: contact.trim() || null, page });
      setMessage('');
      setContact('');
      setSent(true);
    } catch (e) {
      notify(t('feedback.sendFailed'), (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.box} testID="feedback-form">
      <Text style={styles.title}>{t('feedback.title')}</Text>
      <Text style={styles.sub}>{t('feedback.lead')}</Text>
      {sent ? <Text style={styles.thanks}>{t('feedback.thanks')}</Text> : null}
      <TextInput style={[styles.input, styles.multi]} value={message} onChangeText={(text) => { setMessage(text); setSent(false); }}
        placeholder={t('feedback.placeholder')} placeholderTextColor={colors.faint} multiline maxLength={2000}
        textAlignVertical="top" testID="feedback-message" />
      <TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder={t('feedback.contact')}
        placeholderTextColor={colors.faint} autoCapitalize="none" keyboardType="email-address" maxLength={100} testID="feedback-contact" />
      <Button title={t('feedback.send')} icon="send" onPress={send} loading={sending} testID="feedback-send" />
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
