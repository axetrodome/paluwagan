import { makeRedirectUri } from 'expo-auth-session';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';

import { AuthLayout } from '../../components/auth/auth-layout';
import { SignInForm } from '../../components/auth/sign-in-form';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function SignInRoute() {
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const redirectTo = makeRedirectUri({ scheme: 'paluwagan', path: 'auth/callback' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(typeof notice === 'string' ? notice : null);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return setMessage('Enter your email address.');
    if (password.length < 6) return setMessage('Your password must be at least 6 characters.');
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setShowResendConfirmation(false);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (error) throw error;
      router.replace('/');
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('email not confirmed')) {
        setShowResendConfirmation(true);
        setMessage('Please confirm your email before signing in. Check your inbox or resend the confirmation email below.');
      } else {
        reportError(error, { screen: 'sign-in' });
        setMessage(getFriendlyErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendConfirmation() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setMessage('Enter your email address first.');
      return;
    }
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMessage('Confirmation email sent. Check your inbox, then open the newest link.');
    } catch (error) {
      reportError(error, { screen: 'sign-in-resend-confirmation' });
      setMessage(getFriendlyErrorMessage(error, 'Could not resend the confirmation email. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Could not start Google sign-in.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;

      const callbackUrl = new URL(result.url);
      const queryParams = new URLSearchParams(callbackUrl.search);
      const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
      const errorDescription = queryParams.get('error_description') ?? hashParams.get('error_description');
      if (errorDescription) throw new Error(errorDescription);

      const code = queryParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (!accessToken || !refreshToken) {
          throw new Error('Google sign-in did not return a valid session.');
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }
      router.replace('/');
    } catch (error) {
      reportError(error, { screen: 'sign-in-google' });
      setMessage(getFriendlyErrorMessage(error, 'Google sign-in failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <KeyboardAvoidingView className="flex-1" style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView className="flex-1" style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <AuthLayout title="Welcome back" subtitle="Sign in to manage your Paluwagan." message={message}>
            <SignInForm
              email={email}
              password={password}
              submitting={submitting}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={submit}
              onGoogleSignIn={signInWithGoogle}
              onForgotPassword={() => router.push('/auth/forgot-password')}
              showResendConfirmation={showResendConfirmation}
              onResendConfirmation={resendConfirmation}
              onSignUp={() => router.push('/auth/sign-up')}
            />
          </AuthLayout>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
