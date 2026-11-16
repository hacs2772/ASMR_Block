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
import { useTranslation } from 'react-i18next';
import i18n, { loadLang } from '@/locales';

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
  const { t } = useTranslation();
  const status = useAuth((s) => s.status);
  const [introDone, setIntroDone] = useState(false);
  // 전에 고른 언어를 시작 화면이 떠 있는 동안 불러옴 (화면이 한 번 다른 언어로 깜빡이지 않게)
  const [langReady, setLangReady] = useState(false);
  useEffect(() => { void loadLang().finally(() => setLangReady(true)); }, []);
  useEffect(() => {
    const timer = setTimeout(() => setIntroDone(true), STARTUP_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  // 언어를 바꾸면 서버 글(블록·조합 이름, 트리거 이름)을 새 언어로 다시 받음 (편집 중인 조합은 그대로 — 편집기는 처음 한 번만 불러옴)
  useEffect(() => {
    const refetch = () => { void queryClient.invalidateQueries(); };
    i18n.on('languageChanged', refetch);
    return () => i18n.off('languageChanged', refetch);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      useAuth.getState().expire();
      queryClient.removeQueries({ queryKey: ['me'] });
    });
    useAuth.getState().bootstrap();
  }, []);

  if (status === 'loading' || !introDone || !langReady) return <StartupScreen />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <PlayerProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: t('nav.login'), presentation: 'modal' }} />
              <Stack.Screen name="signup" options={{ title: t('nav.signup'), presentation: 'modal' }} />
              <Stack.Screen name="editor/[id]" options={{ title: t('nav.editor'), gestureEnabled: false }} />
              <Stack.Screen name="player/[id]" options={{ title: '', presentation: 'modal' }} />
              <Stack.Screen name="help" options={{ title: t('nav.help'), presentation: 'modal' }} />
              <Stack.Screen name="recording-guide" options={{ title: t('nav.recGuide') }} />
              <Stack.Screen name="creator/[id]" options={{ title: '' }} />
              <Stack.Screen name="notifications" options={{ title: t('nav.notifications') }} />
              <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
              <Stack.Screen name="coins" options={{ title: t('nav.coins') }} />
            </Stack>
          </PlayerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
