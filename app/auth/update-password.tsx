import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView } from 'react-native';

import { AuthLayout } from '../../components/auth/auth-layout';
import { UpdatePasswordForm } from '../../components/auth/update-password-form';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';

export default function UpdatePasswordRoute() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>('Choose a new password for your account.');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (password.length < 6) return setMessage('Your password must be at least 6 characters.');
    if (!supabase) {
      setMessage('Supabase is not configured yet. Add your environment variables and try again.');
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.replace('/auth/sign-in');
    } catch (error) {
      reportError(error, { screen: 'update-password' });
      setMessage(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <KeyboardAvoidingView className="flex-1" style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', default: undefined })}>
        <ScrollView className="flex-1" style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          <AuthLayout title="New password" subtitle="Use a password you have not used elsewhere." message={message}>
            <UpdatePasswordForm
              password={password}
              submitting={submitting}
              onPasswordChange={setPassword}
              onSubmit={submit}
              onBackToSignIn={() => router.replace('/auth/sign-in')}
            />
          </AuthLayout>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
