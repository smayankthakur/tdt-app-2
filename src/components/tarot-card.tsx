import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cardImageUrl } from '@/constants/config';
import { Colors, Fonts, Gradients } from '@/constants/theme';
import type { TarotCard } from '@/data/cards';

/** Tarot cards on the website are roughly 2:3.4 */
export const CARD_RATIO = 1.7;

export function CardBack({ width }: { width: number }) {
  const height = width * CARD_RATIO;
  return (
    <LinearGradient colors={Gradients.cardBack} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.face, { width, height }]}>
      <View style={[styles.inner, { borderRadius: width * 0.06 }]}>
        <Text style={[styles.backStar, { fontSize: width * 0.32 }]}>✦</Text>
        <Text style={[styles.backMoon, { fontSize: width * 0.12 }]}>☾ ✧ ☽</Text>
      </View>
    </LinearGradient>
  );
}

export function CardFront({ card, width }: { card: TarotCard; width: number }) {
  const height = width * CARD_RATIO;
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.face, styles.front, { width, height }]}>
      {!failed ? (
        <Image
          source={{ uri: cardImageUrl(card.name) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
          accessibilityLabel={card.name}
          onError={() => setFailed(true)}
        />
      ) : (
        // Offline / image missing: show a styled text face instead
        <LinearGradient colors={['#1B1826', '#2A1454']} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={[styles.fallbackStar, { fontSize: width * 0.22 }]}>✦</Text>
          <Text style={[styles.fallbackName, { fontSize: Math.max(11, width * 0.1) }]}>{card.name}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

type FlipProps = {
  card: TarotCard;
  width: number;
  revealed: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** A card that flips from back to front when `revealed` becomes true. */
export function FlipCard({ card, width, revealed, onPress, style }: FlipProps) {
  const progress = useSharedValue(revealed ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(revealed ? 1 : 0, { duration: 650 });
  }, [revealed, progress]);

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
    opacity: progress.value < 0.5 ? 1 : 0,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [-180, 0])}deg` }],
    opacity: progress.value >= 0.5 ? 1 : 0,
  }));

  const height = width * CARD_RATIO;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={revealed ? card.name : 'Face-down tarot card'}
      style={[{ width, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hideBack, backStyle]}>
        <CardBack width={width} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hideBack, frontStyle]}>
        <CardFront card={card} width={width} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(244,197,66,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  front: { backgroundColor: Colors.card },
  inner: {
    position: 'absolute',
    top: '6%',
    bottom: '6%',
    left: '8%',
    right: '8%',
    borderWidth: 1,
    borderColor: 'rgba(244,197,66,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backStar: { color: Colors.gold },
  backMoon: { color: Colors.goldSoft, marginTop: 6, letterSpacing: 2 },
  hideBack: { backfaceVisibility: 'hidden' },
  fallback: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  fallbackStar: { color: Colors.gold },
  fallbackName: { fontFamily: Fonts.display, color: Colors.text, textAlign: 'center', marginTop: 8 },
});
