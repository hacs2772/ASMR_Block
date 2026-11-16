import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { View, type ColorValue } from 'react-native';
import { BrandTitle } from '@/components/Brand';
import { WelcomeGuide } from '@/components/guide/GuideHost';
import { HeaderActions } from '@/components/HeaderActions';
import { MiniPlayer } from '@/components/MiniPlayer';
import type { IconName } from '@/components/ui';
import { colors } from '@/theme';
import { useTranslation } from 'react-i18next';

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <>
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
      {/* 아래 탭 5칸: 홈 · 블록 구매 · ★추천 조합 · 블록 편집 · 블록 판매 (도움말·내 정보는 오른쪽 위) */}
      <Tabs.Screen name="index" options={{ title: t('nav.home'), headerTitle: () => <BrandTitle />, tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="explore" options={{ title: t('nav.shop'), headerTitle: t('nav.shopTitle'), tabBarIcon: tabIcon('storefront') }} />
      <Tabs.Screen name="combos" options={{ title: t('nav.combos'), headerTitle: t('nav.combosTitle'), tabBarIcon: tabIcon('star') }} />
      <Tabs.Screen name="library" options={{ title: t('nav.edit'), headerTitle: t('nav.editTitle'), tabBarIcon: tabIcon('create') }} />
      <Tabs.Screen name="upload" options={{ title: t('nav.sell'), headerTitle: t('nav.sellTitle'), tabBarIcon: tabIcon('cloud-upload') }} />
    </Tabs>
    {/* 처음 켰을 때 한 번: 담기 → 끌어서 쌓기 → 시간 정하기 → 듣기 */}
    <WelcomeGuide />
    </>
  );
}
