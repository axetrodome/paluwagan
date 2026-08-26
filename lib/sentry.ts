import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-op when EXPO_PUBLIC_SENTRY_DSN isn't set, so this is safe for local/open-source setups.
if (dsn) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    debug: __DEV__,
  });
}

export { Sentry };
