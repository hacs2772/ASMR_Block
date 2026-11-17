import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, Tabs } from 'expo-router/tabs';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandTitle } from '@/components/Brand';
import { WelcomeGuide } from '@/components/guide/GuideHost';
import { HeaderActions } from '@/components/HeaderActions';
import { MiniPlayer } from '@/components/MiniPlayer';
import type { IconName } from '@/components/ui';
import { colors, fonts, tones } from '@/theme';
import { useTranslation } from 'react-i18next';

/** 아래 탭 아이콘: 고른 탭은 분홍 블록 위에 흰 아이콘 (B안 장난감 블록) */
function tabIcon(name: IconName) {
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    if (!focused) return <View style={styles.iconSlot}><Ionicons name={name} color={color as string} size={size - 1} /></View>;
    return (
      <View style={styles.iconSlot}>
        <View style={styles.onBrick}>
          <View style={styles.onBrickTop} />
          <Ionicons name={name} color={colors.white} size={size - 5} />
        </View>
      </View>
    );
  }
  return TabIcon;
}

const styles = StyleSheet.create({
  iconSlot: { width: 44, height: 28, alignItems: 'center', justifyContent: 'center' },
  onBrick: {
    width: 42, height: 28, borderRadius: 5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingBottom: 2,
    backgroundColor: tones.pink.base, borderWidth: 1.5, borderColor: tones.pink.edge, borderBottomWidth: 4, borderBottomColor: tones.pink.bottom,
  },
  onBrickTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 2.5, backgroundColor: tones.pink.top },
});

export default function TabsLayout() {
  const { t } = useTranslation();
  // 고른 탭 블록(28px) + 이름이 다 보이게 탭 바를 조금 높게
  const insets = useSafeAreaInsets();
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
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 21 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1.5, height: 62 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: colors.text,
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
