import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Shimmer } from '@/components/effects';
import { Body, Button, Card, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { COURSES, formatINR, type Course } from '@/data/courses';
import { useLang } from '@/i18n';
import { openInApp } from '@/lib/links';

function CourseImage({ uri, style }: { uri: string; style: object }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[style, { overflow: 'hidden', backgroundColor: Colors.bgElevated }]}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={250} onLoad={() => setLoaded(true)} />
      <Shimmer visible={!loaded} />
    </View>
  );
}

export default function CoursesScreen() {
  const { t } = useLang();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState<Course | null>(null);
  const contentW = Math.min(width, 900) - Spacing.lg * 2;
  const cols = width > 700 ? 3 : 2;
  const cardW = (contentW - Spacing.md * (cols - 1)) / cols;

  return (
    <Screen tab>
      <Eyebrow>{t('home.eyebrow')}</Eyebrow>
      <Title>{t('courses.title')}</Title>
      <Body muted>{t('courses.sub')}</Body>

      <View style={styles.grid}>
        {COURSES.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => {
              tap();
              setOpen(c);
            }}
            style={({ pressed }) => [styles.card, { width: cardW }, pressed && { transform: [{ scale: 0.97 }] }]}>
            <CourseImage uri={c.image} style={{ width: '100%', aspectRatio: 1 }} />
            <View style={styles.cardBody}>
              <Text style={styles.level}>{c.level}</Text>
              <Text style={styles.cardTitle} numberOfLines={3}>
                {c.title}
              </Text>
              {StorePolicy.courseEnrolLinks && <Text style={styles.price}>{formatINR(c.price)}</Text>}
            </View>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open && (
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <View style={styles.modalBar}>
                <Pressable accessibilityLabel={t('common.close')} onPress={() => setOpen(null)} hitSlop={12} style={styles.close}>
                  <Ionicons name="close" size={22} color={Colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                <CourseImage uri={open.image} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: Radius.lg }} />
                <Eyebrow>{open.level}</Eyebrow>
                <Text style={styles.modalTitle}>{open.title}</Text>
                <Body>{open.summary}</Body>
                <Card>
                  <Text style={styles.h}>{t('courses.whatYouLearn')}</Text>
                  {open.highlights.map((h) => (
                    <View key={h} style={styles.li}>
                      <Ionicons name="star" size={14} color={Colors.gold} />
                      <Body style={{ flex: 1 }}>{h}</Body>
                    </View>
                  ))}
                </Card>
                <Card>
                  <Text style={styles.h}>{t('courses.access')}</Text>
                  <Body muted>{t('courses.accessText')}</Body>
                </Card>
                {StorePolicy.courseEnrolLinks && (
                  <>
                    <Text style={styles.modalPrice}>{formatINR(open.price)}</Text>
                    <Button label={t('courses.enrol')} icon="open-outline" onPress={() => openInApp(open.enrolUrl)} />
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.sm },
  card: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: 'rgba(23,17,31,0.92)', borderWidth: 1, borderColor: Colors.cardBorder },
  cardBody: { padding: Spacing.sm + 2, gap: 3 },
  level: { fontFamily: Fonts.bodySemi, fontSize: 10.5, color: Colors.gold, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardTitle: { fontFamily: Fonts.serif, fontSize: 15, lineHeight: 20, color: Colors.text },
  price: { fontFamily: Fonts.bodySemi, fontSize: 14, color: Colors.goldSoft, marginTop: 2 },
  modalBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  modalContent: { padding: Spacing.lg, gap: Spacing.md, maxWidth: 680, width: '100%', alignSelf: 'center' },
  modalTitle: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, color: Colors.text },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  li: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalPrice: { fontFamily: Fonts.display, fontSize: 26, color: Colors.goldSoft, textAlign: 'center', marginTop: Spacing.sm },
});
