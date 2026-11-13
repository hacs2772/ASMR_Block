import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setSessionExpiredHandler } from '@/api/client';
import { PlayerProvider } from '@/audio/PlayerProvider';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary, border: colors.border, text: colors.text },
};

export default function RootLayout() {
  const status = useAuth((s) => s.status);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      useAuth.getState().expire();
      queryClient.removeQueries({ queryKey: ['me'] });
    });
    useAuth.getState().bootstrap();
  }, []);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={theme}>
          <PlayerProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ title: '로그인', presentation: 'modal' }} />
              <Stack.Screen name="signup" options={{ title: '회원가입', presentation: 'modal' }} />
              <Stack.Screen name="editor/[id]" options={{ title: '조합 만들기' }} />
              <Stack.Screen name="player/[id]" options={{ title: '', presentation: 'modal' }} />
            </Stack>
          </PlayerProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
