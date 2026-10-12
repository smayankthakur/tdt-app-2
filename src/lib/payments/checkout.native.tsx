/* eslint-disable @typescript-eslint/no-require-imports */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Fonts } from '@/constants/theme';
import type { CheckoutOptions, CheckoutResult } from '@/lib/payments/types';

/**
 * Razorpay Standard Checkout inside a WebView (native). Uses only the PUBLIC Key ID.
 * UPI app links (upi://, intent://, tez://, phonepe:// …) are handed to the phone so the UPI app opens.
 */
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
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body style="margin:0;background:#0B0710">
<script>
  function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  try {
    var options = ${JSON.stringify(options).replace(/</g, '\\u003c')};
    options.handler = function (r) { send({ type: 'success', data: r }); };
    options.modal = { ondismiss: function () { send({ type: 'dismiss' }); }, escape: false };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (r) { send({ type: 'failed', message: (r && r.error && r.error.description) || '' }); });
    rzp.open();
  } catch (e) { send({ type: 'failed', message: String(e) }); }
</script></body></html>`;
}

/** Android "intent://pay?…#Intent;scheme=upi;…;end" → "upi://pay?…" so the UPI app opens. */
function intentToUrl(url: string): string {
  if (!url.startsWith('intent://')) return url;
  const scheme = /[#;]scheme=([^;]+)/.exec(url)?.[1];
  const body = url.slice('intent://'.length).split('#Intent')[0];
  return scheme ? `${scheme}://${body}` : url;
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

  const finish = (r: CheckoutResult) => {
    pending?.resolve(r);
    setPending(null);
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
              const url = req.url;
              if (url.startsWith('http') || url.startsWith('about:') || url.startsWith('data:')) return true;
              Linking.openURL(intentToUrl(url)).catch(() => {});
              return false;
            }}
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
