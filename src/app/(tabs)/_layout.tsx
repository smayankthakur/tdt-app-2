import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, active: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Ionicons name={focused ? active : name} size={23} color={color} />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarStyle: {
          backgroundColor: '#0E0D14',
          borderTopColor: 'rgba(244,197,66,0.12)',
        },
        tabBarLabelStyle: { fontFamily: Fonts.bodyMedium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="reading" options={{ title: 'Reading', tabBarIcon: icon('sparkles-outline', 'sparkles') }} />
      <Tabs.Screen name="daily" options={{ title: 'Daily Card', tabBarIcon: icon('sunny-outline', 'sunny') }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: icon('school-outline', 'school') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu-outline', 'menu') }} />
    </Tabs>
  );
}
