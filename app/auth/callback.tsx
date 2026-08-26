import type { EmailOtpType } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const { access_token, code, error_description, refresh_token, token_hash, type } = useLocalSearchParams<{
    access_token?: string;
    code?: string;
    error_description?: string;
    refresh_token?: string;
    token_hash?: string;
    type?: string;
  }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    const client = supabase;
    if (!client) {
      setStatus('error');
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    async function finishAuthentication() {
      if (typeof error_description === 'string') {
        setStatus('error');
        setMessage(error_description);
        return;
      }

      let error: Error | null = null;

      if (typeof token_hash === 'string' && typeof type === 'string') {
        const result = await client.auth.verifyOtp({
          token_hash,
          type: type as EmailOtpType,
        });
        error = result.error;
      } else if (typeof access_token === 'string' && typeof refresh_token === 'string') {
        const result = await client.auth.setSession({ access_token, refresh_token });
        error = result.error;
      } else if (typeof code === 'string') {
        const result = await client.auth.exchangeCodeForSession(code);
        error = result.error;
      } else {
        setStatus('error');
        setMessage('This link is missing its confirmation code. Request a new email link and try again.');
        return;
      }

      if (error) {
        reportError(error, { screen: 'auth-callback' });
        setStatus('error');
        setMessage(getFriendlyErrorMessage(error));
        return;
      }

      setStatus('success');
      setMessage(type === 'recovery' ? 'Your reset link is confirmed. Opening password reset...' : 'Your email is confirmed. Opening Paluwagan...');
      redirectTimer = setTimeout(() => {
        router.replace(type === 'recovery' ? '/auth/update-password' : '/');
      }, 1200);
    }

    void finishAuthentication();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [access_token, code, error_description, refresh_token, supabase, token_hash, type]);

  return (
    <View className="flex-1 items-center justify-center bg-[#F6F5F0] p-6">
      <View className="w-full max-w-[440px] items-center rounded-3xl border border-[#E4E7E4] bg-white p-7">
        {status === 'loading' && <ActivityIndicator color="#0B7A75" size="large" />}
        {status === 'success' && <Text className="mb-4 text-3xl font-extrabold text-[#0B7A75]">Done</Text>}
        {status === 'error' && <Text className="mb-4 text-3xl font-extrabold text-[#A54222]">Unable to confirm</Text>}
        <Text className="text-center text-base leading-[22px] text-[#294243]">{message}</Text>
        {status === 'error' && (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => router.replace('/auth/sign-in')}
            className="mt-6 min-h-[52px] w-full items-center justify-center rounded-xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">Back to sign in</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
