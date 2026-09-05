import PostHog from 'posthog-react-native';

type PostHogEventProperties = NonNullable<Parameters<PostHog['capture']>[1]>;

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// No-op when EXPO_PUBLIC_POSTHOG_API_KEY isn't set, so this is safe for local/open-source setups.
// Session replay disabled for now (requires a native build, breaks in Expo Go / non-rebuilt dev client).
export const posthog = apiKey
  ? new PostHog(apiKey, {
      host,
      enableSessionReplay: false,
    })
  : null;

if (__DEV__) {
  posthog?.debug();
}

/** Capture a product analytics event (no-op if PostHog isn't configured). */
export function trackEvent(name: string, properties?: PostHogEventProperties) {
  posthog?.capture(name, properties);
}

/** Associate subsequent events with the signed-in user (no-op if PostHog isn't configured). */
export function identifyUser(userId: string, properties?: PostHogEventProperties) {
  posthog?.identify(userId, properties);
}

/** Clear the identified user, e.g. on sign-out or account deletion. */
export function resetAnalytics() {
  posthog?.reset();
}
