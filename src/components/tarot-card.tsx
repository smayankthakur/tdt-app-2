import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Shimmer } from '@/components/effects';
import { cardImageUrl } from '@/constants/config';
import { Colors, Fonts, Gradients } from '@/constants/theme';
import type { TarotCard } from '@/data/cards';

export const CARD_RATIO = 1.7;

/** The mystic card back used everywhere. */
export function CardBack({ width, ring }: { width: number; ring?: boolean }) {
  const height = width * CARD_RATIO;
  return (
    <LinearGradient
      colors={Gradients.cardBack}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.face, { width, height, borderRadius: Math.max(6, width * 0.08) }, ring && styles.ring]}>
      <View style={[styles.inner, { borderRadius: Math.max(4, width * 0.06) }]}>
        <View style={[styles.circle, { width: width * 0.62, height: width * 0.62, borderRadius: width }]} />
        <Text style={[styles.backStar, { fontSize: width * 0.3 }]}>✦</Text>
        {width > 56 && <Text style={[styles.backMoon, { fontSize: width * 0.11 }]}>☾ ✧ ☽</Text>}
      </View>
    </LinearGradient>
  );
}

export function CardFront({ card, width, ring }: { card: TarotCard; width: number; ring?: boolean }) {
  const height = width * CARD_RATIO;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[styles.face, styles.front, { width, height, borderRadius: Math.max(6, width * 0.08) }, ring && styles.ring]}>
      {!failed ? (
        <>
          <Image
            source={{ uri: cardImageUrl(card.name) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="disk"
            transition={250}
            accessibilityLabel={card.name}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
          <Shimmer visible={!loaded} />
        </>
      ) : (
        <LinearGradient colors={['#17111F', '#2A1250']} style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={[styles.fallbackStar, { fontSize: width * 0.22 }]}>✦</Text>
          <Text style={[styles.fallbackName, { fontSize: Math.max(10, width * 0.1) }]}>{card.name}</Text>
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
  ring?: boolean;
};

/** A card that flips from back to front when `revealed` becomes true. */
export function FlipCard({ card, width, revealed, onPress, style, ring }: FlipProps) {
  const progress = useSharedValue(revealed ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(revealed ? 1 : 0, { duration: 700 });
  }, [revealed, progress]);

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }, { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.06, 1]) }],
    opacity: progress.value < 0.5 ? 1 : 0,
  }));
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(progress.value, [0, 1], [-180, 0])}deg` }, { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.06, 1]) }],
    opacity: progress.value >= 0.5 ? 1 : 0,
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={revealed ? card.name : 'Face-down tarot card'}
      style={[{ width, height: width * CARD_RATIO }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hideBack, backStyle]}>
        <CardBack width={width} ring={ring} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.hideBack, frontStyle]}>
        <CardFront card={card} width={width} ring={ring} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(233,196,106,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { borderWidth: 3, borderColor: Colors.goldBright },
  front: { backgroundColor: Colors.card },
  inner: {
    position: 'absolute',
    top: '6%',
    bottom: '6%',
    left: '8%',
    right: '8%',
    borderWidth: 1,
    borderColor: 'rgba(233,196,106,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(233,196,106,0.3)' },
  backStar: { color: Colors.gold },
  backMoon: { color: Colors.goldSoft, marginTop: 4, letterSpacing: 2 },
  hideBack: { backfaceVisibility: 'hidden' },
  fallback: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  fallbackStar: { color: Colors.gold },
  fallbackName: { fontFamily: Fonts.display, color: Colors.text, textAlign: 'center', marginTop: 8 },
});
