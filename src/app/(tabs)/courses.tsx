import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Eyebrow, Screen, tap, Title } from '@/components/ui';
import { StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { COURSES, formatINR } from '@/data/courses';

export default function CoursesScreen() {
  return (
    <Screen>
      <Eyebrow>Learn from the reader</Eyebrow>
      <Title>Courses</Title>
      <Body muted>Tarot, runes, dice aur candle wax reading — beginner se advanced tak.</Body>

      <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
        {COURSES.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => { tap(); router.push(`/course/${c.id}`); }}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
            <Image source={{ uri: c.image }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            <View style={styles.body}>
              <Text style={styles.level}>{c.level}</Text>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>{c.summary}</Text>
              {StorePolicy.courseEnrolLinks && <Text style={styles.price}>{formatINR(c.price)}</Text>}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  image: { width: '100%', aspectRatio: 16 / 9, backgroundColor: Colors.bgElevated },
  body: { padding: Spacing.md, gap: 4 },
  level: { fontFamily: Fonts.bodySemi, fontSize: 11.5, color: Colors.gold, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: Fonts.serif, fontSize: 18, color: Colors.text },
  summary: { fontFamily: Fonts.body, fontSize: 13.5, lineHeight: 20, color: Colors.textMuted },
  price: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.goldSoft, marginTop: 4 },
});
