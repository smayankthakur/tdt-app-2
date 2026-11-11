import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassTabBar, type TabBarProps } from '@/components/glass-tab-bar';
import { ProfileBubble } from '@/components/profile-bubble';
import { useLang } from '@/i18n';

/**
 * The tab screens sit inside a BlurTargetView and the glass tab bar is drawn outside it, on top:
 * Android's real blur (Android 12+) needs the blurred content in a separate target view.
 */
export default function TabLayout() {
  const { t } = useLang();
  const target = useRef<View>(null);
  const [bar, setBar] = useState<TabBarProps | null>(null);

  return (
    <View style={styles.root}>
      <BlurTargetView ref={target} style={styles.root}>
        <Tabs
          tabBar={(props) => <TabBarBridge {...(props as unknown as TabBarProps)} onChange={setBar} />}
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            sceneStyle: { backgroundColor: 'transparent' },
          }}>
          <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
          <Tabs.Screen name="reading" options={{ title: t('tabs.reading') }} />
          <Tabs.Screen name="courses" options={{ title: t('tabs.courses') }} />
          <Tabs.Screen name="book" options={{ title: t('tabs.booking') }} />
          <Tabs.Screen name="report" options={{ title: t('tabs.reports') }} />
          <Tabs.Screen name="kundli" options={{ title: t('tabs.kundli') }} />
          {/* Profile is opened from the bubble at the top right, not from the bar (client, 11 Nov) */}
          <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
        </Tabs>
      </BlurTargetView>
      {bar && <GlassTabBar {...bar} blurTarget={target} />}
      <ProfileBubble active={bar?.state.routes[bar.state.index]?.name === 'profile'} />
    </View>
  );
}

/** Hands the navigator's tab-bar props to the bar drawn outside the blur target. Renders nothing itself. */
function TabBarBridge({ onChange, ...props }: TabBarProps & { onChange: (p: TabBarProps) => void }) {
  const keys = props.state.routes.map((r) => `${r.key}:${props.descriptors[r.key]?.options.title ?? ''}`).join('|');
  useEffect(() => {
    onChange(props);
    // re-publish only when the active tab, the tabs or their titles change (props is a new object every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.state.index, keys, onChange]);
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
});
