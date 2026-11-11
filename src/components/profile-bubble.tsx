import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/components/ui';
import { Colors, Fonts, Gradients } from '@/constants/theme';
import { useLang } from '@/i18n';
import { useSession } from '@/lib/session';

export const BUBBLE_SIZE = 40;

/**
 * Profile lives in a round bubble at the top right of every tab (client, 11 Nov): the person's photo, else the first
 * letter of their name, else a person icon. A gold ring while the Profile screen is open.
 */
export function ProfileBubble({ active }: { active: boolean }) {
  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { user, profile } = useSession();
  const name = profile.name || user?.displayName || user?.email || '';
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 10 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tabs.profile')}
        accessibilityState={{ selected: active }}
        hitSlop={8}
        onPress={() => {
          tap();
          router.navigate('/profile');
        }}>
        <LinearGradient colors={active ? Gradients.goldRing : ['rgba(251,231,181,0.75)', 'rgba(233,196,106,0.35)']} style={styles.ring}>
          {profile.photo ? (
            <Image source={{ uri: profile.photo }} style={styles.inner} contentFit="cover" />
          ) : (
            <View style={[styles.inner, styles.empty]}>
              {user && name ? <Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text> : <Ionicons name="person" size={18} color={Colors.goldSoft} />}
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 14, zIndex: 20 },
  ring: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  inner: { flex: 1, borderRadius: BUBBLE_SIZE / 2 },
  empty: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(28,16,44,0.92)' },
  initial: { fontFamily: Fonts.display, fontSize: 17, color: Colors.goldSoft },
});
