/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Adds the Firebase + Google Sign-In native plugins ONLY when the Firebase
 * config files are present in the project root, so the app still builds
 * (in guest mode) before Firebase is set up. See docs/SETUP-FIREBASE.md.
 *
 *   google-services.json        → Android
 *   GoogleService-Info.plist    → iOS
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const root = process.cwd();
  const androidFile = './google-services.json';
  const iosFile = './GoogleService-Info.plist';
  const hasAndroid = fs.existsSync(path.join(root, androidFile));
  const hasIos = fs.existsSync(path.join(root, iosFile));
  // The Firebase/Google plugins configure BOTH platforms and throw during prebuild when either
  // platform's file is missing, so on EAS (which tells us the platform) require that platform's
  // file, and otherwise (local prebuild of both) require both files.
  const platform = process.env.EAS_BUILD_PLATFORM;
  const firebase = platform === 'android' ? hasAndroid : platform === 'ios' ? hasIos : hasAndroid && hasIos;

  // Always dynamic frameworks on iOS: the @react-native-firebase pods are autolinked even in a
  // guest-mode build, and in their default SPM mode `pod install` aborts under static linkage.
  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? []), ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }]];
  if (firebase) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin');
  }

  return {
    ...config,
    name: config.name ?? 'The Divine Tarot',
    slug: config.slug ?? 'the-divine-tarot',
    plugins,
    android: {
      ...config.android,
      ...(hasAndroid ? { googleServicesFile: androidFile } : {}),
    },
    ios: {
      ...config.ios,
      ...(hasIos ? { googleServicesFile: iosFile } : {}),
    },
    extra: {
      ...config.extra,
      firebaseNative: firebase,
    },
  };
};
