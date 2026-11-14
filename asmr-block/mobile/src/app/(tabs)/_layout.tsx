import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View, type ColorValue } from 'react-native';
import { BrandTitle } from '@/components/Brand';
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
      }}
    >
      {/* 큰 메뉴는 단순하게: 홈 · 구매 · 편집 · 업로드 (+ 내 정보) */}
      <Tabs.Screen name="index" options={{ title: '홈', headerTitle: () => <BrandTitle />, tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="explore" options={{ title: '구매', headerTitle: '블록 상점', tabBarIcon: tabIcon('storefront') }} />
      <Tabs.Screen name="library" options={{ title: '편집', headerTitle: 'ASMR 편집', tabBarIcon: tabIcon('create') }} />
      <Tabs.Screen name="upload" options={{ title: '업로드', headerTitle: 'ASMR 업로드', tabBarIcon: tabIcon('cloud-upload') }} />
      <Tabs.Screen name="profile" options={{ title: '내 정보', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
