import { router } from 'expo-router';
import { Text } from 'react-native';
import { AuthForm } from '@/components/AuthForm';
import { Button } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  return (
    <AuthForm
      fields={[
        { key: 'email', label: '이메일', email: true, placeholder: 'email@example.com' },
        { key: 'password', label: '비밀번호', secure: true },
      ]}
      submitLabel="로그인"
      onSubmit={async ({ email = '', password = '' }) => {
        await login(email, password);
        router.back();
      }}
      footer={
        <>
          <Button title="처음이에요 · 회원가입" variant="ghost" onPress={() => router.replace('/signup')} />
          {__DEV__ && <Text style={{ color: colors.faint, fontSize: 12, textAlign: 'center' }}>테스트 계정: test@asmrblock.com / password123</Text>}
        </>
      }
    />
  );
}
