import { Sentry } from './sentry';

// Known Postgres/PostgREST error codes mapped to messages that are safe to show users.
const KNOWN_ERROR_CODES: Record<string, string> = {
  '23505': 'This already exists. Please use a different value.',
  '23503': "This action can't be completed because related data is missing.",
  '42501': "You don't have permission to do that.",
  PGRST116: 'We could not find that record.',
};

/** Turn a thrown error into a message that's safe to show a user, without leaking backend details. */
export function getFriendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = (error as { code?: string } | null)?.code;
  if (code && KNOWN_ERROR_CODES[code]) {
    return KNOWN_ERROR_CODES[code];
  }

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('network request failed') || normalized.includes('failed to fetch')) {
    return "We couldn't connect to the server. Please check your internet connection and try again.";
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (normalized.includes('already registered')) {
    return 'An account with this email already exists.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (normalized.includes('duplicate key value')) {
    return 'This already exists. Please use a different value.';
  }

  // Only surface the raw message if it doesn't look like backend/SQL noise.
  if (message && !/postgrest|constraint|relation|column|syntax error|stack trace/i.test(message)) {
    return message;
  }

  return fallback;
}

/** Report an error to Sentry (no-op if not configured) and log it locally in development. */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error(error, context);
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
