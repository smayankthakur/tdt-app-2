import { Cinzel_400Regular, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_400Regular_Italic, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';
import { DarkTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';

import { IntroSplash } from '@/components/intro-splash';
import { Starfield } from '@/components/starfield';
import { Colors, Fonts } from '@/constants/theme';
import i18n, { loadSavedLanguage } from '@/i18n';
import { initCrashReporting, wrapRoot } from '@/lib/crash';
import { startEvents } from '@/lib/events';
import { onNotificationTap, syncNotifications } from '@/lib/notifications';
import { CheckoutHost } from '@/lib/payments/checkout';
import { SessionProvider } from '@/lib/session';

initCrashReporting();
SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.gold,
    // transparent so the shared animated starfield shows behind the tabs
    background: 'transparent',
    card: Colors.bg,
    text: Colors.text,
    border: 'rgba(255,255,255,0.06)',
  },
};

function RootLayout() {
  const [langReady, setLangReady] = useState(false);
  const [loaded, error] = useFonts({
    Cinzel_400Regular,
    Cinzel_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    loadSavedLanguage().finally(() => setLangReady(true));
  }, []);

  const ready = (loaded || !!error) && langReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Subscribe only once the Stack is mounted: navigating earlier (a tap that cold-starts the app
  // while fonts load) throws "Attempted to navigate before mounting the Root Layout".
  useEffect(() => {
    if (!ready) return;
    return onNotificationTap((url) => {
      try {
        router.navigate(url as '/');
      } catch {
        // ignore
      }
    });
  }, [ready]);

  // Re-plan local notifications (festival dates, streak) on start, on return to the app and on a language change.
  useEffect(() => {
    if (!ready) return;
    startEvents();
    syncNotifications();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && syncNotifications());
    const onLang = () => syncNotifications();
    i18n.on('languageChanged', onLang);
    return () => {
      sub.remove();
      i18n.off('languageChanged', onLang);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <SessionProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: Colors.bg }}>
          <Starfield />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.gold,
              headerTitleStyle: { fontFamily: Fonts.display, color: Colors.text },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              // pushed screens are opaque (see Screen/Backdrop); the tabs stay transparent
              contentStyle: { backgroundColor: 'transparent' },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="card/[id]" options={{ title: '' }} />
            <Stack.Screen name="history" options={{ title: '' }} />
            <Stack.Screen name="deck" options={{ title: '' }} />
            <Stack.Screen name="panchang" options={{ title: '' }} />
            <Stack.Screen name="horoscope" options={{ title: '' }} />
            <Stack.Screen name="festivals" options={{ title: '' }} />
            <Stack.Screen name="admin" options={{ title: '' }} />
            <Stack.Screen name="web" options={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }} />
            {/* transparent so the starfield shows behind the login card */}
            <Stack.Screen name="login" options={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
          </Stack>
          <IntroSplash />
          <CheckoutHost />
        </View>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default wrapRoot(RootLayout);
