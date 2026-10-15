import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { StoryFrame, storyStyles } from '@/components/share-card';
import { HoroscopeCard, HoroscopeSetup, MoonSignSheet, signName, Stars } from '@/components/today';
import { Body, Button, Screen } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useLang } from '@/i18n';
import { track } from '@/lib/events';
import { nakshatraLabel } from '@/lib/horoscope';
import { formatTime } from '@/lib/kundli/panchang';
import { shareStory } from '@/lib/share';
import { useToday } from '@/lib/today';

export default function HoroscopeScreen() {
  const { t, lang } = useLang();
  const { date, panchang, horoscope, birth } = useToday();
  const [picking, setPicking] = useState(false);
  const shotRef = useRef<View>(null);
  useEffect(() => track('horoscope_view'), []);

  const share = () => {
    if (!horoscope) return;
    const text = `${t('today.horoscopeTitle')} — ${signName(horoscope.rashi.index, lang)}\n\n${horoscope.text}\n\n${t('share.horoscopeFooter')}`;
    shareStory(shotRef, text);
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: t('today.horoscopeTitle') }} />
      {!birth.loaded ? null : !birth.moon ? (
        <HoroscopeSetup needsTime={birth.needsTime} onPick={() => setPicking(true)} />
      ) : !panchang || !horoscope ? (
        <View style={styles.wait}>
          <ActivityIndicator color={Colors.gold} />
          <Body muted>{t('panchang.computing')}</Body>
        </View>
      ) : (
        <>
          <HoroscopeCard h={horoscope} tz={panchang.place.tz} date={date} />
          <Text style={styles.meta}>
            {t('today.todayNakshatra')}: {nakshatraLabel(panchang.nakshatras[0].index, lang)}
            {birth.moon.nakshatra !== null ? ` · ${t('today.birthNakshatra')}: ${nakshatraLabel(birth.moon.nakshatra, lang)}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label={t('share.story')} icon="share-social-outline" variant="ghost" small style={{ flex: 1 }} onPress={share} />
            <Button label={t('today.changeSign')} icon="moon-outline" variant="ghost" small style={{ flex: 1 }} onPress={() => setPicking(true)} />
          </View>
          <Button label={t('panchang.title')} icon="calendar-outline" variant="ghost" small onPress={() => router.push('/panchang')} />
          <Text style={styles.note}>{t('today.basedOn')}</Text>

          <StoryFrame ref={shotRef} eyebrow={t('today.horoscopeTitle')} footer={t('share.horoscopeFooter')}>
            <Text style={storyStyles.title}>{signName(horoscope.rashi.index, lang)}</Text>
            <View style={storyStyles.row}>
              <Stars n={horoscope.stars} size={22} />
            </View>
            <Text style={storyStyles.label}>{horoscope.area}</Text>
            <Text style={storyStyles.text}>{horoscope.text}</Text>
            <Text style={storyStyles.label}>
              {t('today.luckyColour')}: {horoscope.luckyColour} · {t('today.luckyNumber')}: {horoscope.luckyNumber}
            </Text>
            {horoscope.bestTime && (
              <Text style={storyStyles.label}>
                {t('today.bestTime')}: {formatTime(horoscope.bestTime.start, panchang.place.tz)}–{formatTime(horoscope.bestTime.end, panchang.place.tz)}
              </Text>
            )}
          </StoryFrame>
        </>
      )}
      <MoonSignSheet
        visible={picking}
        onClose={() => setPicking(false)}
        current={birth.moon}
        onPick={(m) => birth.setPicked(m)}
        onUseBirth={birth.hasBirth ? () => birth.setPicked(null) : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wait: { alignItems: 'center', gap: Spacing.sm, paddingTop: 60 },
  meta: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.textMuted, textAlign: 'center' },
  note: { fontFamily: Fonts.body, fontSize: 11.5, lineHeight: 17, color: Colors.textDim, textAlign: 'center' },
});
