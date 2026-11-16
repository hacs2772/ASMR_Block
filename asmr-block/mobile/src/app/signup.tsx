import { router } from 'expo-router';
import { AuthForm } from '@/components/AuthForm';
import { LegalNote } from '@/components/LegalNote';
import { Button } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { useTranslation } from 'react-i18next';

export default function SignupScreen() {
  const { t } = useTranslation();
  const signup = useAuth((s) => s.signup);
  return (
    <AuthForm
      fields={[
        { key: 'email', label: t('auth.email'), email: true, placeholder: 'email@example.com' },
        { key: 'password', label: t('auth.passwordRule'), secure: true },
        { key: 'nickname', label: t('auth.nicknameRule') },
      ]}
      submitLabel={t('auth.signupSubmit')}
      onSubmit={async ({ email = '', password = '', nickname = '' }) => {
        await signup(email, password, nickname);
        router.back();
      }}
      footer={(
        <>
          <LegalNote kind="signup" extra={t('legal.under14')} />
          <Button title={t('auth.toLogin')} variant="ghost" onPress={() => router.replace('/login')} />
        </>
      )}
    />
  );
}
