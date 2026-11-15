import { router } from 'expo-router';
import { AuthForm } from '@/components/AuthForm';
import { LegalNote } from '@/components/LegalNote';
import { Button } from '@/components/ui';
import { useAuth } from '@/store/auth';

export default function SignupScreen() {
  const signup = useAuth((s) => s.signup);
  return (
    <AuthForm
      fields={[
        { key: 'email', label: '이메일', email: true, placeholder: 'email@example.com' },
        { key: 'password', label: '비밀번호 (8자 이상)', secure: true },
        { key: 'nickname', label: '닉네임 (2~20자)' },
      ]}
      submitLabel="가입하고 시작하기"
      onSubmit={async ({ email = '', password = '', nickname = '' }) => {
        await signup(email, password, nickname);
        router.back();
      }}
      footer={(
        <>
          <LegalNote action="가입하면" extra="만 14세 미만은 가입할 수 없어요." />
          <Button title="이미 계정이 있어요 · 로그인" variant="ghost" onPress={() => router.replace('/login')} />
        </>
      )}
    />
  );
}
