import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Eyebrow, Screen } from '@/components/ui';
import { Links, StorePolicy } from '@/constants/config';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { COURSES, formatINR } from '@/data/courses';
import { openInApp } from '@/lib/links';

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = COURSES.find((c) => c.id === id);

  if (!course) {
    return (
      <Screen edges={[]}>
        <Body>Course not found.</Body>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: course.level }} />
      <Image source={{ uri: course.image }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
      <Eyebrow>{course.level}</Eyebrow>
      <Text style={styles.title}>{course.title}</Text>
      <Body>{course.summary}</Body>

      <Card>
        <Text style={styles.h}>What you’ll learn</Text>
        {course.highlights.map((h) => (
          <View key={h} style={styles.li}>
            <Ionicons name="star" size={14} color={Colors.gold} />
            <Body style={{ flex: 1 }}>{h}</Body>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.h}>Course access</Text>
        <Body muted>Recorded video lessons with one year of access. Login details are shared by email after enrolment.</Body>
      </Card>

      {StorePolicy.courseEnrolLinks ? (
        <>
          <Text style={styles.price}>{formatINR(course.price)}</Text>
          <Button label="Enrol on the website" icon="open-outline" onPress={() => openInApp(Links.courses)} />
        </>
      ) : (
        <Body muted style={{ textAlign: 'center', marginTop: Spacing.sm }}>
          Enrolments are handled by The Divine Tarot team.
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg, backgroundColor: Colors.bgElevated },
  title: { fontFamily: Fonts.serif, fontSize: 26, lineHeight: 32, color: Colors.text },
  h: { fontFamily: Fonts.bodySemi, fontSize: 15, color: Colors.text },
  li: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  price: { fontFamily: Fonts.display, fontSize: 26, color: Colors.goldSoft, textAlign: 'center', marginTop: Spacing.sm },
});
