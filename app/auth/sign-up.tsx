import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';

import { AuthLayout } from '../../components/auth/auth-layout';
import { SignUpForm } from '../../components/auth/sign-up-form';
import { ensureProfile } from '../../lib/auth-profile';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

export default function SignUpRoute() {
  const redirectTo = makeRedirectUri({ scheme: 'paluwagan', path: 'auth/callback' });
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!displayName.trim()) return setMessage('Enter the name you want members to see.');
    if (!trimmedEmail) return setMessage('Enter your email address.');
    if (password.length < 6) return setMessage('Your password must be at least 6 characters.');
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { display_name: displayName.trim() }, emailRedirectTo: redirectTo },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists. Try signing in instead.');
        }
        throw error;
      }
      if (data.user && data.user.identities?.length === 0) {
        setMessage('An account with this email already exists. Try signing in instead.');
        return;
      }
      if (data.session) {
        await ensureProfile(data.session.user);
        router.replace('/');
        return;
      }
      router.replace({
        pathname: '/auth/sign-in',
        params: { notice: 'Check your email to confirm your account, then sign in.' },
      });
    } catch (error) {
      reportError(error, { screen: 'sign-up' });
      setMessage(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <KeyboardAvoidingView className="flex-1" style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView className="flex-1" style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <AuthLayout title="Start your group" subtitle="Keep every contribution and payout clear for your whole group." message={message}>
            <SignUpForm
              displayName={displayName}
              email={email}
              password={password}
              submitting={submitting}
              onDisplayNameChange={setDisplayName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={submit}
              onSignIn={() => router.replace('/auth/sign-in')}
            />
          </AuthLayout>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
