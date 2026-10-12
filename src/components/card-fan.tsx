import { memo, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { CARD_RATIO, CardBack } from '@/components/tarot-card';
import { tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

/**
 * The interactive deck: all 78 face-down cards dealt into a swipeable arc.
 * The card nearest the centre rises into focus; tapping a card lifts it out with a gold ring.
 */
const CARD_W = 74;
const STEP = 34; // horizontal spacing between overlapping cards

type Props = {
  count: number; // number of cards in the deck (78)
  picked: number[]; // indexes already pulled
  onPick: (index: number) => void;
  hint: string;
};

const FanCard = memo(function FanCard({
  i,
  scrollX,
  side,
  picked,
  onPick,
  dealt,
}: {
  i: number;
  scrollX: SharedValue<number>;
  side: number;
  picked: boolean;
  onPick: (i: number) => void;
  dealt: SharedValue<number>;
}) {
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = picked ? withSpring(1, { damping: 14 }) : withTiming(0);
  }, [picked, lift]);

  const style = useAnimatedStyle(() => {
    const center = side + i * STEP + CARD_W / 2;
    const viewCenter = scrollX.value + side + CARD_W / 2; // centre of the viewport in content coords
    const d = (center - viewCenter) / STEP; // distance from centre, in cards
    const rot = interpolate(d, [-8, 0, 8], [-26, 0, 26], Extrapolation.CLAMP);
    const arcY = interpolate(Math.abs(d), [0, 8], [0, 46], Extrapolation.CLAMP);
    const focus = interpolate(Math.abs(d), [0, 1.2], [1, 0], Extrapolation.CLAMP);
    const deal = interpolate(dealt.value, [0, 1], [180, 0]);
    return {
      opacity: picked ? 1 - lift.value * 0.75 : interpolate(dealt.value, [0, 0.4, 1], [0, 1, 1]),
      zIndex: Math.round(100 - Math.abs(d) * 2),
      transform: [
        { translateY: arcY - focus * 22 - lift.value * 70 + deal },
        { rotate: `${rot}deg` },
        { scale: 1 + focus * 0.14 },
      ],
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', left: side + i * STEP, top: 70 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Card ${i + 1}`}
        disabled={picked}
        onPress={() => onPick(i)}>
        <CardBack width={CARD_W} ring={picked} />
      </Pressable>
    </Animated.View>
  );
});

export function CardFan({ count, picked, onPick, hint }: Props) {
  const { width } = useWindowDimensions();
  const viewW = Math.min(width, 700);
  const side = viewW / 2 - CARD_W / 2;
  const scrollX = useSharedValue(0);
  const dealt = useSharedValue(0);
  const ref = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    dealt.value = withDelay(80, withTiming(1, { duration: Platform.OS === 'web' ? 300 : 900 }));
    // start in the middle of the deck
    const t = setTimeout(() => ref.current?.scrollTo({ x: (count / 2) * STEP, animated: false }), 20);
    return () => clearTimeout(t);
  }, [count, dealt]);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const handlePick = (i: number) => {
    tap('light');
    onPick(i);
  };

  return (
    <View style={{ height: CARD_W * CARD_RATIO + 150 }}>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={STEP}
        decelerationRate="fast"
        contentContainerStyle={{ width: side * 2 + (count - 1) * STEP + CARD_W, height: CARD_W * CARD_RATIO + 130 }}>
        {Array.from({ length: count }, (_, i) => (
          <FanCard key={i} i={i} scrollX={scrollX} side={side} picked={picked.includes(i)} onPick={handlePick} dealt={dealt} />
        ))}
      </Animated.ScrollView>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: Fonts.serifItalic, color: Colors.goldSoft, textAlign: 'center', fontSize: 14, marginTop: -6 },
});
