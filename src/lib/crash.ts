import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting (Sentry project "tdt-app", organisation sitelytc-digital-media).
 * The DSN is public by design. Only release builds report. No personal data is attached:
 * no IP address, no user email or name — the app never calls Sentry.setUser.
 */
export const SENTRY_DSN = 'https://9111aae22e2e4fef5de244c1a09940e3@o4511533804158976.ingest.us.sentry.io/4512255988006912';

export function initCrashReporting() {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    beforeBreadcrumb: (b) => (b.category === 'console' ? null : b), // console logs can hold user text
  });
}

export const wrapRoot = Sentry.wrap;
