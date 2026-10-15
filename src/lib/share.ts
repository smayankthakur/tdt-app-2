/* eslint-disable @typescript-eslint/no-require-imports */
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';

import { track } from '@/lib/events';

/**
 * Share a view as a PNG image (react-native-view-shot + expo-sharing).
 * Falls back to sharing plain text on web or if a native module is missing.
 */
export async function shareViewAsImage(ref: RefObject<View | null>, fallbackText: string, size?: { width: number; height: number }): Promise<void> {
  if (Platform.OS !== 'web' && ref.current) {
    try {
      const { captureRef } = require('react-native-view-shot');
      const Sharing = require('expo-sharing');
      const uri: string = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', ...(size ?? {}) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'The Divine Tarot', UTI: 'public.png' });
        return;
      }
    } catch {
      // fall through to text share
    }
  }
  try {
    await Share.share({ message: fallbackText });
  } catch {
    // user cancelled
  }
}

/** Share a 9:16 StoryFrame (src/components/share-card.tsx) as a 1080×1920 image. */
export function shareStory(ref: RefObject<View | null>, fallbackText: string, kind = 'story'): Promise<void> {
  track('share', { kind });
  return shareViewAsImage(ref, fallbackText, { width: 1080, height: 1920 });
}
