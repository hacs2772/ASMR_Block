import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setSessionExpiredHandler } from '@/api/client';
import { PlayerProvider } from '@/audio/PlayerProvider';
import { StartupScreen } from '@/components/BlockLoader';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, border: colors.border, text: colors.text },
};

/** 앱을 켤 때 블록이 딸깍 붙는 모습을 한 번은 보여 주는 최소 시간 */
const STARTUP_MIN_MS = 1100;

export default function RootLayout() {
  const status = useAuth((s) => s.status);
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), STARTUP_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      useAuth.getState().expire();
      queryClient.removeQueries({ queryKey: ['me'] });
    });
    useAuth.getState().bootstrap();
  }, []);

  if (status === 'loading' || !introDone) return <StartupScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <PlayerProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: '로그인', presentation: 'modal' }} />
              <Stack.Screen name="signup" options={{ title: '회원가입', presentation: 'modal' }} />
              <Stack.Screen name="editor/[id]" options={{ title: '조합 만들기', gestureEnabled: false }} />
              <Stack.Screen name="player/[id]" options={{ title: '', presentation: 'modal' }} />
            </Stack>
          </PlayerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
