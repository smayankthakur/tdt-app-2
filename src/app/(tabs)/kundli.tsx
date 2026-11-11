import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CountUp } from "@/components/effects";
import { ErrorNote, TextField } from "@/components/form";
import { DateField, PlaceField, TimeField } from "@/components/pickers";
import {
  Body,
  Button,
  Card,
  Eyebrow,
  Screen,
  tap,
  Title,
} from "@/components/ui";
import { SiteImages } from "@/constants/config";
import { Colors, Fonts, Radius, Spacing } from "@/constants/theme";
import type { City } from "@/data/cities";
import { useLang } from "@/i18n";
import { emailTypo, isEmailAddress } from "@/lib/email";
import {
  computeMatch,
  kootaImpact,
  type MatchResult,
  type Person as SitePerson,
} from "@/lib/kundli/site/ashtakoota";
import { moonSiderealPosition, toUtcInstant } from "@/lib/kundli/site/moon";
import { openCheckout } from "@/lib/payments/checkout";
import { useSession } from "@/lib/session";
import {
  orderKundliReport,
  SiteError,
  verifyKundliReport,
} from "@/lib/site-orders";
import { useSiteConfig } from "@/lib/site-config";
import { readJSON, Storage, writeJSON } from "@/lib/storage";
import { useBookingsOpen } from "@/lib/use-bookings-open";
import { track } from "@/lib/events";

/**
 * Kundli Milan — exactly the website's (thedivinetarotonline.com/kundli-milan): the same Moon / Ashtakoota
 * calculation (src/lib/kundli/site, copied from the website), nothing shown before paying, ₹99 through the website's
 * own order API, and the detailed report emailed by the website. Paid matches are remembered on this phone.
 */
type Person = {
  name: string;
  dob: string;
  tob: string;
  unknownTime: boolean;
  place: City | null;
};
const EMPTY: Person = {
  name: "",
  dob: "",
  tob: "",
  unknownTime: false,
  place: null,
};
const PAID_KEY = "tdt.kundliPaid.v2";
type Paid = { key: string; email: string; emailed: boolean; at: number };

/** The website's inputs: date, time (12:00 when unknown) and the birth place's UTC offset in minutes. */
function sitePerson(p: Person): SitePerson | null {
  const utc = toUtcInstant(
    p.dob,
    p.unknownTime || !p.tob ? "12:00" : p.tob,
    Math.round((p.place?.tz ?? 5.5) * 60),
  );
  if (!utc) return null;
  const pos = moonSiderealPosition(utc);
  return {
    name: p.name.trim().slice(0, 60) || "Person",
    rashi: pos.rashi,
    nakshatra: pos.nakshatra,
  };
}
const pairKey = (a: SitePerson, b: SitePerson) =>
  [a.name, a.rashi, a.nakshatra, b.name, b.rashi, b.nakshatra]
    .join("|")
    .toLowerCase();

/** Keyed by account: logging out (or another person logging in) clears the two people's birth details. */
export default function KundliScreen() {
  const { user } = useSession();
  return <KundliForm key={user?.uid ?? "guest"} />;
}

function KundliForm() {
  const { t } = useLang();
  const { user } = useSession();
  const bookingsOpen = useBookingsOpen();
  const site = useSiteConfig();
  const price = site.kundli.price;
  const [boy, setBoy] = useState<Person>(EMPTY);
  const [girl, setGirl] = useState<Person>(EMPTY);
  const [match, setMatch] = useState<{
    a: SitePerson;
    b: SitePerson;
    result: MatchResult;
  } | null>(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const [pending, setPending] = useState(false);
  const [paid, setPaid] = useState<Paid[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef<unknown>(null);

  useEffect(() => {
    readJSON<{ boy: Person; girl: Person } | null>(
      Storage.KEYS.kundliForm,
      null,
    ).then((f) => {
      if (f) {
        setBoy({ ...EMPTY, ...f.boy });
        setGirl({ ...EMPTY, ...f.girl });
      }
    });
    readJSON<Paid[]>(PAID_KEY, []).then(setPaid);
    Storage.getBookingEmail().then((e) =>
      setEmail((x) => x || e || user?.email || ""),
    );
    // once, when the screen opens (the screen is keyed by account)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editing either person makes the shown match stale: hide it until "Match" is pressed again.
  const editBoy = (p: Person) => {
    setBoy(p);
    setMatch(null);
  };
  const editGirl = (p: Person) => {
    setGirl(p);
    setMatch(null);
  };

  const valid = (p: Person) =>
    !!p.name.trim() && !!p.dob && !!p.place && (p.unknownTime || !!p.tob);

  const calculate = () => {
    if (!valid(boy) || !valid(girl)) {
      setError(t("kundli.missing"));
      return;
    }
    const a = sitePerson(boy);
    const b = sitePerson(girl);
    if (!a || !b) {
      setError(t("kundli.badDate"));
      return;
    }
    setError("");
    setPayError("");
    setPending(false);
    tap("success");
    writeJSON(Storage.KEYS.kundliForm, { boy, girl });
    setMatch({ a, b, result: computeMatch(a, b) });
  };

  const key = match ? pairKey(match.a, match.b) : "";
  const bought = paid.find((x) => x.key === key);

  const remember = async (p: Paid) => {
    const list = [
      p,
      ...(await readJSON<Paid[]>(PAID_KEY, [])).filter((x) => x.key !== p.key),
    ].slice(0, 30);
    await writeJSON(PAID_KEY, list);
    setPaid(list);
  };

  const buy = async () => {
    if (!match) return;
    const mail = email.trim().toLowerCase();
    if (!isEmailAddress(mail)) {
      setPayError(t("kundli.emailInvalid"));
      return;
    }
    setPayError("");
    setPending(false);
    setBusy(true);
    try {
      const order = await orderKundliReport(mail, match.a, match.b);
      track("checkout_start", { product: "kundli_report_site" });
      const r = await openCheckout({
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        name: "The Divine Tarot",
        description: "Kundli Milan — Detailed Compatibility Report",
        image: SiteImages.logo,
        order_id: order.orderId,
        prefill: {
          email: mail,
          name: user?.displayName || undefined,
          contact: user?.phoneNumber || undefined,
        },
        theme: { color: Colors.gold },
      });
      if (r.status === "success") {
        const v = await verifyKundliReport(
          mail,
          match.a,
          match.b,
          order.orderId,
          r.data,
        );
        tap("success");
        track("payment_success", { product: "kundli_report_site" });
        await remember({
          key,
          email: mail,
          emailed: v.emailed !== false,
          at: Date.now(),
        });
      } else if (r.status === "cancelled")
        setPayError(t("kundli.payCancelled"));
      else if (r.status === "failed" && r.message === "update-app")
        setPayError(t("booking.errUpdate"));
      // Bank page / UPI app: the website's webhook finishes the order and emails the report
      else setPending(true);
    } catch (e) {
      const code = e instanceof SiteError ? e.code : "server";
      setPayError(
        code === "network"
          ? t("booking.errNetwork")
          : (e as Error).message || t("kundli.payFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const typo = emailTypo(email);

  return (
    <Screen tab scrollRef={scrollRef}>
      <Eyebrow>{t("kundli.eyebrow")}</Eyebrow>
      <Title>{t("kundli.title")}</Title>
      <Body muted>{t("kundli.subtitle")}</Body>

      {!site.kundli.enabled ? (
        <Card style={{ alignItems: "center", gap: Spacing.sm }}>
          <Ionicons name="moon-outline" size={32} color={Colors.gold} />
          <Text style={[styles.h, { textAlign: "center" }]}>
            {t("kundli.closedTitle")}
          </Text>
          <Body muted style={{ textAlign: "center" }}>
            {t("kundli.closedBody")}
          </Body>
          <Button
            small
            label={t("home.heroCta")}
            icon="sparkles"
            onPress={() => router.navigate("/reading")}
          />
        </Card>
      ) : null}
      {site.kundli.enabled ? (
        <>
          <PersonForm
            title={t("kundli.person1")}
            sub={t("kundli.person1Sub")}
            icon="male"
            value={boy}
            onChange={editBoy}
          />
          <PersonForm
            title={t("kundli.person2")}
            sub={t("kundli.person2Sub")}
            icon="female"
            value={girl}
            onChange={editGirl}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("kundli.match")} icon="heart" onPress={calculate} />
          <Text style={styles.note}>{t("kundli.timeNote")}</Text>
        </>
      ) : null}
      {match && site.kundli.enabled && (
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={{ gap: Spacing.md }}
          // the result / paywall appears below the fold: bring it into view
          onLayout={(e) => {
            if (scrolledFor.current === match) return; // once per match, not on every re-layout
            scrolledFor.current = match;
            scrollRef.current?.scrollTo({
              y: Math.max(0, e.nativeEvent.layout.y - Spacing.lg),
              animated: true,
            });
          }}
        >
          {bought ? (
            <>
              <Scorecard result={match.result} />
              <Card style={{ alignItems: "center", gap: Spacing.sm }}>
                <Ionicons
                  name={bought.emailed ? "checkmark-circle" : "alert-circle"}
                  size={36}
                  color={bought.emailed ? Colors.success : Colors.coral}
                />
                <Text style={styles.h}>
                  {bought.emailed
                    ? t("kundli.sentTitle")
                    : t("kundli.notSentTitle")}
                </Text>
                <Body muted style={{ textAlign: "center" }}>
                  {bought.emailed
                    ? t("kundli.sentText", { email: bought.email })
                    : t("kundli.notSentText", { email: bought.email })}
                </Body>
                {!bought.emailed && (
                  <Button
                    small
                    variant="ghost"
                    label={t("booking.needHelp")}
                    icon="help-buoy-outline"
                    onPress={() => router.push("/support")}
                  />
                )}
              </Card>
            </>
          ) : (
            // Paywall gate — shown the moment Match is pressed, BEFORE the result (as on the website)
            <Card style={{ alignItems: "center", gap: Spacing.md }}>
              <View style={styles.lock}>
                <Ionicons name="lock-closed" size={30} color={Colors.gold} />
              </View>
              <Text style={[styles.h, { fontSize: 22, textAlign: "center" }]}>
                {t("kundli.readyTitle")}
              </Text>
              <Body muted style={{ textAlign: "center" }}>
                {t("kundli.readyText", { price })}
              </Body>
              <View style={{ alignSelf: "stretch", gap: 8 }}>
                {[
                  t("kundli.f1"),
                  t("kundli.f2"),
                  t("kundli.f3"),
                  t("kundli.f4"),
                ].map((f) => (
                  <View key={f} style={styles.feature}>
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={Colors.success}
                      style={{ marginTop: 2 }}
                    />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {pending ? (
                <View style={styles.pending}>
                  <Ionicons name="time-outline" size={18} color={Colors.gold} />
                  <Text style={styles.featureText}>
                    {t("kundli.pendingText", { email: email.trim() })}
                  </Text>
                </View>
              ) : null}
              <View style={{ alignSelf: "stretch", gap: 6 }}>
                <TextField
                  label={t("kundli.emailLabel")}
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {typo ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEmail(typo)}
                  >
                    <Text style={styles.link}>
                      {t("booking.didYouMean", { email: typo })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Button
                label={t("kundli.pay", { price })}
                icon="lock-open"
                onPress={buy}
                loading={busy}
                style={{ alignSelf: "stretch" }}
              />
              <ErrorNote text={payError} />
              <Text style={styles.note}>{t("kundli.secure")}</Text>
            </Card>
          )}

          <Body muted style={{ fontSize: 12.5, lineHeight: 19 }}>
            {t("kundli.disclaimer")}
          </Body>
          {bookingsOpen && (
            <Button
              label={t("profile.personal")}
              variant="ghost"
              icon="sparkles-outline"
              onPress={() => router.navigate('/book')}
            />
          )}
        </Animated.View>
      )}
    </Screen>
  );
}

const LEVEL: Record<
  "strong" | "fair" | "weak",
  { color: string; key: string }
> = {
  strong: { color: Colors.success, key: "kundli.levelStrong" },
  fair: { color: Colors.gold, key: "kundli.levelFair" },
  weak: { color: Colors.danger, key: "kundli.levelWeak" },
};

/** The website's scorecard: score out of 36, verdict, strong / weak areas, doshas, and the 8 kootas with their impact. */
function Scorecard({ result }: { result: MatchResult }) {
  const { t } = useLang();
  const impacts = useMemo(
    () => result.kootas.map((k) => ({ k, i: kootaImpact(k) })),
    [result],
  );
  const strong = impacts.filter((x) => x.i.level === "strong").length;
  const weak = impacts.filter((x) => x.i.level === "weak").map((x) => x.i.area);
  const pct = Math.round((result.total / 36) * 100);
  return (
    <View style={{ gap: Spacing.md }}>
      <Card style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>{t("kundli.yourCompat")}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline" }}>
          <CountUp
            key={result.total}
            to={result.total}
            style={styles.scoreNum}
          />
          <Text style={styles.of36}> / 36</Text>
        </View>
        <Text style={styles.verdict}>{result.verdict}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Body muted style={{ textAlign: "center" }}>
          {t("kundli.strongOf8", { n: strong })}{" "}
          {weak.length
            ? t("kundli.weakAreas", { areas: weak.join(", ") })
            : t("kundli.noWeak")}
        </Body>
        {result.doshas.length > 0 && (
          <View style={styles.dosha}>
            <Ionicons name="warning" size={16} color={Colors.coral} />
            <Text style={styles.doshaText}>
              {t("kundli.doshaPresent", { doshas: result.doshas.join(" & ") })}
            </Text>
          </View>
        )}
      </Card>

      <Text style={[styles.h, { textAlign: "center" }]}>
        {t("kundli.kootasTitle")}
      </Text>
      <Body muted style={{ textAlign: "center" }}>
        {t("kundli.kootasSub")}
      </Body>
      {impacts.map(({ k, i }) => {
        const lv = LEVEL[i.level];
        return (
          <Card key={k.key} style={{ gap: Spacing.sm }}>
            <View style={styles.kootaHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kootaName}>{k.label}</Text>
                <Text style={styles.kootaArea}>{i.area}</Text>
              </View>
              <Text style={[styles.badge, { backgroundColor: lv.color }]}>
                {t(lv.key)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <View style={[styles.track, { flex: 1, marginTop: 0 }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${k.max ? (k.score / k.max) * 100 : 0}%`,
                      backgroundColor: lv.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.kootaScore, { color: lv.color }]}>
                {k.score}/{k.max}
              </Text>
            </View>
            <Text style={styles.featureText}>{i.impact}</Text>
            <Text style={styles.weight}>
              ♥ {t("kundli.weight", { n: i.weight })}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

function PersonForm({
  title,
  sub,
  icon,
  value,
  onChange,
}: {
  title: string;
  sub: string;
  icon: "male" | "female";
  value: Person;
  onChange: (p: Person) => void;
}) {
  const { t } = useLang();
  const set = (patch: Partial<Person>) => onChange({ ...value, ...patch });
  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.formHead}>
        <View style={styles.badgeIcon}>
          <Ionicons name={icon} size={16} color={Colors.bgDeep} />
        </View>
        <Text style={styles.formTitle}>{title}</Text>
        <Text style={styles.formSub}>{sub}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{t("kundli.name")} *</Text>
        <TextInput
          value={value.name}
          onChangeText={(name) => set({ name })}
          placeholder={t("kundli.namePlaceholder")}
          placeholderTextColor={Colors.textDim}
          style={styles.input}
          maxLength={60}
        />
      </View>
      <DateField
        label={t("kundli.dob")}
        value={value.dob}
        onChange={(dob) => set({ dob })}
      />
      {!value.unknownTime && (
        <TimeField
          label={t("kundli.tob")}
          value={value.tob}
          onChange={(tob) => set({ tob })}
        />
      )}
      <Pressable
        style={styles.switchRow}
        onPress={() => set({ unknownTime: !value.unknownTime })}
      >
        <Text style={styles.switchLabel}>{t("kundli.unknownTime")}</Text>
        <Switch
          value={value.unknownTime}
          onValueChange={(unknownTime) => set({ unknownTime })}
          trackColor={{ true: Colors.gold, false: "#3A3448" }}
          thumbColor={Colors.text}
        />
      </Pressable>
      <PlaceField
        label={t("kundli.pob")}
        value={value.place}
        onChange={(place) => set({ place })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  formHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  formSub: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
  label: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.textMuted },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  error: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.danger,
    textAlign: "center",
  },
  note: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textDim,
    textAlign: "center",
    fontStyle: "italic",
  },
  h: { fontFamily: Fonts.display, fontSize: 18, color: Colors.text },
  lock: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,196,106,0.12)",
    borderWidth: 1,
    borderColor: "rgba(233,196,106,0.35)",
  },
  feature: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  featureText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  pending: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    alignSelf: "stretch",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: "rgba(233,196,106,0.08)",
  },
  link: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.gold },
  scoreCard: { alignItems: "center", gap: Spacing.sm },
  scoreLabel: {
    fontFamily: Fonts.bodySemi,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scoreNum: { fontFamily: Fonts.display, fontSize: 56, color: Colors.gold },
  of36: { fontFamily: Fonts.display, fontSize: 22, color: Colors.textDim },
  verdict: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.text,
    textAlign: "center",
  },
  track: {
    alignSelf: "stretch",
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginTop: 4,
  },
  fill: { height: "100%", borderRadius: 4, backgroundColor: Colors.gold },
  dosha: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(240,134,106,0.4)",
    backgroundColor: "rgba(240,134,106,0.1)",
  },
  doshaText: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 13.5,
    color: Colors.text,
  },
  kootaHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  kootaName: { fontFamily: Fonts.display, fontSize: 16, color: Colors.text },
  kootaArea: { fontFamily: Fonts.body, fontSize: 12, color: Colors.textDim },
  badge: {
    fontFamily: Fonts.bodySemi,
    fontSize: 11,
    color: Colors.bgDeep,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    overflow: "hidden",
    textTransform: "uppercase",
  },
  kootaScore: { fontFamily: Fonts.bodySemi, fontSize: 13 },
  weight: { fontFamily: Fonts.body, fontSize: 11.5, color: Colors.textDim },
});
