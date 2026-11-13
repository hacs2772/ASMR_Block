import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { Button } from './ui';

export type Field = { key: string; label: string; secure?: boolean; email?: boolean; placeholder?: string };

type Props = {
  fields: Field[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  footer?: React.ReactNode;
};

/** 로그인/회원가입 공통 입력 폼 */
export function AuthForm({ fields, submitLabel, onSubmit, footer }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await onSubmit(values);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              style={styles.input}
              value={values[field.key] ?? ''}
              onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
              secureTextEntry={field.secure}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={field.email ? 'email-address' : 'default'}
              placeholder={field.placeholder}
              placeholderTextColor={colors.faint}
              accessibilityLabel={field.label}
              testID={`input-${field.key}`}
            />
          </View>
        ))}
        {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <Button title={submitLabel} onPress={submit} loading={loading} testID="submit" />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, gap: space.lg },
  field: { gap: space.xs },
  label: { color: colors.muted, fontSize: 13 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    color: colors.text, fontSize: 16, paddingHorizontal: space.md, paddingVertical: 12,
  },
  error: { color: colors.danger, fontSize: 14 },
});
