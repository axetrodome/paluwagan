import { ActivityIndicator, Pressable, Text } from 'react-native';

import { AuthField } from './auth-field';

type ForgotPasswordFormProps = {
  email: string;
  submitting: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  onBackToSignIn: () => void;
};

export function ForgotPasswordForm({
  email,
  submitting,
  onEmailChange,
  onSubmit,
  onBackToSignIn,
}: ForgotPasswordFormProps) {
  return (
    <>
      <AuthField
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={onSubmit}
        className="min-h-[54px] items-center justify-center rounded-xl bg-[#0B7A75] active:opacity-70"
      >
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Send reset link</Text>}
      </Pressable>
      <Pressable onPress={onBackToSignIn} className="self-center py-4 active:opacity-70">
        <Text className="text-sm font-bold text-[#0B7A75]">Back to sign in</Text>
      </Pressable>
    </>
  );
}
