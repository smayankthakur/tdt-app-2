import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Body, Card, Chip, Screen } from '@/components/ui';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { funnelReport, type FunnelDay } from '@/lib/cloud/admin';

/**
 * Business numbers (owners only — the server refuses everyone else). English only: it's an internal screen.
 * Counts are installs (unique phones) that reached each step, from Profile → Privacy "usage data" being on.
 */
type Count = Exclude<keyof FunnelDay, 'day' | 'payments' | 'revenue_rupees'>;
const STEPS: [Count, string][] = [
  ['installs', 'New installs'],
  ['opened', 'Opened the app'],
  ['logged_in', 'Logged in / signed up'],
  ['tried_reading', 'Asked Ginni a question'],
  ['saw_paywall', 'Saw a price'],
  ['started_checkout', 'Started paying'],
  ['paid', 'Paid'],
  ['got_reading', 'Got a reading'],
];

export default function AdminScreen() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<FunnelDay[] | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    funnelReport(days).then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, [days]);

  // Per-day sums overcount phones active on several days; fine for a trend view.
  const total = (k: keyof Omit<FunnelDay, 'day'>) => (rows ?? []).reduce((s, r) => s + r[k], 0);
  const top = Math.max(1, total('opened'));

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Business numbers' }} />
      <View style={styles.chips}>
        {[7, 30, 90].map((d) => (
          <Chip key={d} label={`${d} days`} active={days === d} onPress={() => { setRows(undefined); setDays(d); }} />
        ))}
      </View>
      {rows === undefined ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : rows === null ? (
        <Body muted>Couldn’t load the numbers (offline, or this account isn’t an owner).</Body>
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <Text style={styles.h}>Funnel, last {days} days</Text>
            {STEPS.map(([k, label]) => {
              const n = total(k);
              return (
                <View key={k} style={{ gap: 4 }}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.num}>{n}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.bar, { width: `${Math.min(100, (n / top) * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
            <View style={styles.row}>
              <Text style={styles.label}>Payments received (server)</Text>
              <Text style={styles.num}>
                {total('payments')} · ₹{total('revenue_rupees').toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={styles.note}>
              Price → paid: {total('saw_paywall') ? Math.round((total('paid') / total('saw_paywall')) * 100) : 0}% · Opened → paid:{' '}
              {total('opened') ? ((total('paid') / total('opened')) * 100).toFixed(1) : 0}%
            </Text>
          </Card>
          <Card style={{ gap: 6 }}>
            <Text style={styles.h}>By day</Text>
            <View style={styles.row}>
              {['Day', 'Opened', 'Login', 'Price', 'Paid'].map((h) => (
                <Text key={h} style={[styles.cell, styles.head]}>
                  {h}
                </Text>
              ))}
            </View>
            {rows.length === 0 ? <Body muted>No data yet — it starts when the new app version is live.</Body> : null}
            {rows.map((r) => (
              <View key={r.day} style={styles.row}>
                <Text style={styles.cell}>{r.day.slice(5)}</Text>
                <Text style={styles.cell}>{r.opened}</Text>
                <Text style={styles.cell}>{r.logged_in}</Text>
                <Text style={styles.cell}>{r.saw_paywall}</Text>
                <Text style={styles.cell}>{r.paid}</Text>
              </View>
            ))}
          </Card>
          <Text style={styles.note}>
            Steps count only phones with “Share anonymous usage data” on. Payments and ₹ are every in-app Ginni / Kundli / course
            payment (Personal Readings are on the booking site). Full money view: Razorpay Dashboard.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: Spacing.sm },
  h: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  label: { fontFamily: Fonts.body, fontSize: 13.5, color: Colors.textMuted, flex: 1 },
  num: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.text },
  track: { height: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  bar: { height: 6, borderRadius: Radius.pill, backgroundColor: Colors.gold },
  cell: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.text, textAlign: 'center' },
  head: { fontFamily: Fonts.bodySemi, color: Colors.textMuted },
  note: { fontFamily: Fonts.body, fontSize: 12, lineHeight: 18, color: Colors.textDim, textAlign: 'center' },
});
