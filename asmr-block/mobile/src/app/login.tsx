import { router } from 'expo-router';
import { Text } from 'react-native';
import { AuthForm } from '@/components/AuthForm';
import { BetaLoginButton } from '@/components/BetaLoginButton';
import { Button } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  const login = useAuth((s) => s.login);
  return (
    <AuthForm
      fields={[
        { key: 'email', label: t('auth.email'), email: true, placeholder: 'email@example.com' },
        { key: 'password', label: t('auth.password'), secure: true },
      ]}
      header={<BetaLoginButton onDone={() => router.back()} style={{ marginBottom: 12 }} />}
      submitLabel={t('auth.login')}
      onSubmit={async ({ email = '', password = '' }) => {
        await login(email, password);
        router.back();
      }}
      footer={
        <>
          <Button title={t('auth.toSignup')} variant="ghost" onPress={() => router.replace('/signup')} />
          {__DEV__ && <Text style={{ color: colors.faint, fontSize: 12, textAlign: 'center' }}>{t('auth.testAccount')}</Text>}
        </>
      }
    />
  );
}
