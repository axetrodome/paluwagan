import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';

import { AuthLayout } from '../../components/auth/auth-layout';
import { ForgotPasswordForm } from '../../components/auth/forgot-password-form';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordRoute() {
  const redirectTo = makeRedirectUri({ scheme: 'paluwagan', path: 'auth/callback' });
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return setMessage('Enter your email address.');
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) throw error;
      setMessage('Check your email for the password-reset link.');
    } catch (error) {
      reportError(error, { screen: 'forgot-password' });
      setMessage(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <KeyboardAvoidingView className="flex-1" style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView className="flex-1" style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <AuthLayout title="Reset password" subtitle="We’ll send a secure link to your email." message={message}>
            <ForgotPasswordForm
              email={email}
              submitting={submitting}
              onEmailChange={setEmail}
              onSubmit={submit}
              onBackToSignIn={() => router.replace('/auth/sign-in')}
            />
          </AuthLayout>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
