/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import type { CheckoutOptions, CheckoutResult } from '@/lib/payments/types';
import { routeLink } from '@/lib/url';

/**
 * Razorpay Standard Checkout inside a WebView (native). Uses only the PUBLIC Key ID.
 * The whole payment stays inside the app:
 *  - cards / UPI ID / wallets finish in the checkout itself (handler)
 *  - net-banking and card OTP pages can't open as pop-ups in a web view, so window.open returns null;
 *    Razorpay then shows the bank page in this same view and, when done, POSTs to PAYMENT_RETURN_URL.
 *    We catch that address, close the sheet, and the server confirms the order with Razorpay.
 *  - UPI app links (upi://, intent://, tez://, phonepe:// …) open the UPI app, which returns here.
 */
export const PAYMENT_RETURN_URL = 'https://thedivinetarotonline.com/?tdt_payment_return=1';
const isReturn = (url: string) => url.includes('tdt_payment_return=1');
type Pending = { options: CheckoutOptions; resolve: (r: CheckoutResult) => void };
let listener: ((p: Pending | null) => void) | null = null;

export function openCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve({ status: 'failed', message: 'checkout-host-missing' });
      return;
    }
    listener({ options, resolve });
  });
}

let WebView: React.ComponentType<Record<string, unknown>> | null = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

function html(options: CheckoutOptions) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script>window.open = function () { return null; };</script>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body style="margin:0;background:#0B0710">
<script>
  function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  try {
    var options = ${JSON.stringify(options.order_id ? { ...options, callback_url: PAYMENT_RETURN_URL } : options).replace(/</g, '\\u003c')};
    options.handler = function (r) { send({ type: 'success', data: r }); };
    options.modal = { ondismiss: function () { send({ type: 'dismiss' }); }, escape: false };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (r) { send({ type: 'failed', message: (r && r.error && r.error.description) || '' }); });
    rzp.open();
  } catch (e) { send({ type: 'failed', message: String(e) }); }
</script></body></html>`;
}

/** Mount once near the root of the app. */
export function CheckoutHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    listener = setPending;
    return () => {
      listener = null;
    };
  }, []);

  const done = useRef(false);
  useEffect(() => {
    done.current = false;
  }, [pending]);

  const finish = (r: CheckoutResult) => {
    if (done.current) return;
    done.current = true;
    pending?.resolve(r);
    setPending(null);
  };

  const watchReturn = (url?: string) => {
    if (url && isReturn(url)) finish({ status: 'returned' });
  };

  return (
    <Modal visible={!!pending} animationType="slide" onRequestClose={() => finish({ status: 'cancelled' })}>
      <SafeAreaView style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.title}>Secure payment · Razorpay</Text>
          <Pressable accessibilityRole="button" onPress={() => finish({ status: 'cancelled' })} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        {pending && WebView ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: html(pending.options), baseUrl: 'https://thedivinetarotonline.com' }}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />}
            onShouldStartLoadWithRequest={(req: { url: string }) => {
              if (isReturn(req.url)) {
                finish({ status: 'returned' });
                return false;
              }
              const route = routeLink(req.url);
              if (route.kind === 'web') return route.url === req.url;
              // UPI apps, tel:, mailto: … (Google sign-in never appears inside checkout)
              Linking.openURL(route.url).catch(() => {});
              return false;
            }}
            // the return is a form POST, which Android never shows to onShouldStartLoadWithRequest
            onLoadStart={(e: { nativeEvent: { url: string } }) => watchReturn(e.nativeEvent.url)}
            onNavigationStateChange={(s: { url: string }) => watchReturn(s.url)}
            onMessage={(e: { nativeEvent: { data: string } }) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === 'success') finish({ status: 'success', data: msg.data });
                else if (msg.type === 'dismiss') finish({ status: 'cancelled' });
                else if (msg.type === 'failed') finish({ status: 'failed', message: msg.message });
              } catch {
                // ignore
              }
            }}
            style={{ flex: 1, backgroundColor: Colors.bg }}
          />
        ) : pending ? (
          <Text style={styles.err}>Payments need an updated app build (WebView missing).</Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontFamily: Fonts.bodySemi, color: Colors.text, fontSize: 15 },
  close: { color: Colors.textMuted, fontSize: 20 },
  err: { color: Colors.text, padding: 24, fontFamily: Fonts.body },
});
