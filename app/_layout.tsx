import { Stack, router, usePathname, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../global.css';
import { identifyUser, posthog, resetAnalytics } from '../lib/analytics';
import { ensureProfile } from '../lib/auth-profile';
import { reportError } from '../lib/errors';
import { Sentry } from '../lib/sentry';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { useAuthStore } from '../stores/auth-store';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  reportError(error, { screen: 'root-error-boundary' });

  return (
    <View className="flex-1 items-center justify-center bg-[#F6F5F0] px-6">
      <View className="w-full max-w-sm rounded-3xl border border-[#D7E7E5] bg-white p-6">
        <Text className="text-center text-2xl font-extrabold text-[#173334]">Something went wrong</Text>
        <Text className="mt-3 text-center text-base leading-6 text-[#647475]">
          We hit an unexpected error. You can try again, or restart the app if it keeps happening.
        </Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={retry}
          className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
        >
          <Text className="text-base font-extrabold text-white">Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const { session, isReady, setSession, setReady } = useAuthStore();

  useEffect(() => {
    posthog?.screen(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let isMounted = true;
    const client = supabase;

    async function initializeAuth() {
      const { data: { session: currentSession } } = await client.auth.getSession();
      if (!isMounted) return;

      setSession(currentSession);
      if (currentSession) {
        await ensureProfile(currentSession.user);
        identifyUser(currentSession.user.id, { email: currentSession.user.email ?? null });
      }
      setReady(true);
    }

    void initializeAuth();

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      if (nextSession) {
        await ensureProfile(nextSession.user);
        identifyUser(nextSession.user.id, { email: nextSession.user.email ?? null });
      } else {
        resetAnalytics();
      }
      setReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setReady, setSession]);

  useEffect(() => {
    if (!isReady || !supabase) return;

    const isAuthRoute = segments[0] === 'auth';

    if (!session && !isAuthRoute) {
      router.replace('/auth/sign-in');
      return;
    }

    if (session && isAuthRoute) {
      router.replace('/');
    }
  }, [isReady, segments, session]);

  if (supabaseConfigError) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F6F5F0] px-6">
        <View className="w-full max-w-sm rounded-3xl border border-[#D7E7E5] bg-white p-6">
          <Text className="text-center text-2xl font-extrabold text-[#173334]">App configuration missing</Text>
          <Text className="mt-3 text-center text-base leading-6 text-[#647475]">
            Add your Supabase environment variables in .env.local to continue.
          </Text>
        </View>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F6F5F0]">
        <ActivityIndicator size="large" color="#0B7A75" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
