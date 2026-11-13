import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View, type ColorValue } from 'react-native';
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
      <Tabs.Screen name="index" options={{ title: '홈', headerTitle: 'ASMR Block', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="explore" options={{ title: '블록', headerTitle: '블록 둘러보기', tabBarIcon: tabIcon('grid') }} />
      <Tabs.Screen name="library" options={{ title: '내 조합', tabBarIcon: tabIcon('albums') }} />
      <Tabs.Screen name="profile" options={{ title: '내 정보', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}
