/* eslint-disable @typescript-eslint/no-require-imports */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, tap } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { hostOf, intentToUrl, isWebUrl, needsSystemAuth } from '@/lib/url';

/**
 * The app's built-in browser. Every outside page (website, booking, Razorpay payment
 * pages, Kundli, support, socials) opens here, styled like the rest of the app.
 */
type Any = any;
let WebView: Any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

export default function InAppBrowser() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const { t } = useLang();
  const ref = useRef<Any>(null);
  const [nav, setNav] = useState({ canGoBack: false, title: title ?? '', url: url ?? '' });
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const back = useCallback(() => {
    if (nav.canGoBack) {
      ref.current?.goBack();
      return true;
    }
    close();
    return true;
  }, [nav.canGoBack, close]);

  // Android hardware back button moves back inside the page first
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  const onRequest = (req: { url: string }) => {
    const next = req.url;
    if (needsSystemAuth(next)) {
      WebBrowser.openAuthSessionAsync(next).catch(() => {});
      return false;
    }
    if (isWebUrl(next)) return true;
    // upi://, intent://, tel:, mailto:, whatsapp:, tez:, phonepe:, paytmmp: … → the phone's app
    Linking.openURL(intentToUrl(next)).catch(() => {});
    return false;
  };

  const shownTitle = nav.title && !/^https?:/i.test(nav.title) ? nav.title : title || hostOf(nav.url);
  const secure = nav.url.startsWith('https://');

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: !nav.canGoBack }} />
      <SafeAreaView edges={['top']} style={styles.bar}>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { tap(); back(); }} hitSlop={10} style={styles.btn}>
            <Ionicons name="chevron-back" size={24} color={Colors.gold} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {shownTitle || 'The Divine Tarot'}
            </Text>
            <View style={styles.hostRow}>
              {secure && <Ionicons name="lock-closed" size={10} color={Colors.success} />}
              <Text style={styles.host} numberOfLines={1}>
                {hostOf(nav.url)}
              </Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Reload" onPress={() => { tap(); setFailed(false); ref.current?.reload(); }} hitSlop={10} style={styles.btn}>
            <Ionicons name="refresh" size={20} color={Colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tap(); close(); }} hitSlop={10} style={styles.btn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>
        <View style={styles.track}>
          {progress > 0 && progress < 1 && <View style={[styles.fill, { width: `${Math.max(8, progress * 100)}%` }]} />}
        </View>
      </SafeAreaView>

      {!url ? null : failed ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.gold} />
          <Text style={styles.errTitle}>Page could not load</Text>
          <Text style={styles.errText}>Check your internet connection and try again.</Text>
          <Button
            label={t('common.retry')}
            icon="refresh"
            onPress={() => {
              setFailed(false);
              setKey((k) => k + 1);
            }}
          />
        </View>
      ) : WebView ? (
        <WebView
          key={key}
          ref={ref}
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: Colors.bg }}
          containerStyle={{ backgroundColor: Colors.bg }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          // links that try to open a new window/tab load right here instead
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          allowFileAccess
          setBuiltInZoomControls={false}
          applicationNameForUserAgent="TheDivineTarotApp/1.0"
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator color={Colors.gold} size="large" />
            </View>
          )}
          onShouldStartLoadWithRequest={onRequest}
          onNavigationStateChange={(s: { canGoBack: boolean; title: string; url: string }) => setNav({ canGoBack: s.canGoBack, title: s.title, url: s.url })}
          onLoadProgress={(e: { nativeEvent: { progress: number } }) => setProgress(e.nativeEvent.progress)}
          onError={() => setFailed(true)}
          onHttpError={() => {}}
          onOpenWindow={(e: { nativeEvent: { targetUrl: string } }) => {
            const target = e.nativeEvent.targetUrl;
            if (isWebUrl(target)) ref.current?.injectJavaScript(`window.location.href = ${JSON.stringify(target)}; true;`);
            else Linking.openURL(intentToUrl(target)).catch(() => {});
          }}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.errText}>This page needs an updated app build.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  bar: { backgroundColor: Colors.bgDeep, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(233,196,106,0.25)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 6, minHeight: 52 },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  host: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textMuted },
  track: { height: 2, backgroundColor: 'transparent' },
  fill: { height: 2, backgroundColor: Colors.gold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl, backgroundColor: Colors.bg },
  errTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  errText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
