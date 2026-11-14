import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View, type ColorValue } from 'react-native';
import { BrandTitle } from '@/components/Brand';
import { HeaderActions } from '@/components/HeaderActions';
import { MiniPlayer } from '@/components/MiniPlayer';
import type { IconName } from '@/components/ui';
import { colors } from '@/theme';

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      // 탭 바 위에 미니 플레이어
      tabBar={(props) => (
        <View>
          <MiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        sceneStyle: { backgroundColor: colors.bg },
        headerRight: () => <HeaderActions />,
      }}
    >
      {/* 아래 탭 5칸: 홈 · 블록 구매 · ★추천 조합 · 블록 편집 · 업로드 (도움말·내 정보는 오른쪽 위) */}
      <Tabs.Screen name="index" options={{ title: '홈', headerTitle: () => <BrandTitle />, tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="explore" options={{ title: '블록 구매', headerTitle: '블록 상점', tabBarIcon: tabIcon('storefront') }} />
      <Tabs.Screen name="combos" options={{ title: '추천 조합', headerTitle: '추천 조합', tabBarIcon: tabIcon('star') }} />
      <Tabs.Screen name="library" options={{ title: '블록 편집', headerTitle: '블록 편집', tabBarIcon: tabIcon('create') }} />
      <Tabs.Screen name="upload" options={{ title: '업로드', headerTitle: 'ASMR 업로드', tabBarIcon: tabIcon('cloud-upload') }} />
    </Tabs>
  );
}
