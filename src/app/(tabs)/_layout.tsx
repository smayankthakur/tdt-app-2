import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/glass-tab-bar';
import { useLang } from '@/i18n';

export default function TabLayout() {
  const { t } = useLang();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: 'transparent' },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="reading" options={{ title: t('tabs.reading') }} />
      <Tabs.Screen name="courses" options={{ title: t('tabs.courses') }} />
      <Tabs.Screen name="kundli" options={{ title: t('tabs.kundli') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
