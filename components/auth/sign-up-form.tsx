import { ActivityIndicator, Pressable, Text } from 'react-native';

import { AuthField } from './auth-field';

type SignUpFormProps = {
  displayName: string;
  email: string;
  password: string;
  submitting: boolean;
  onDisplayNameChange: (displayName: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onSignIn: () => void;
};

export function SignUpForm({
  displayName,
  email,
  password,
  submitting,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSignIn,
}: SignUpFormProps) {
  return (
    <>
      <AuthField
        label="Display name"
        value={displayName}
        onChangeText={onDisplayNameChange}
        autoCapitalize="words"
      />
      <AuthField
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={onSubmit}
        className="min-h-[54px] items-center justify-center rounded-xl bg-[#0B7A75] active:opacity-70"
      >
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Create account</Text>}
      </Pressable>
      <Text className="mt-4 text-center text-sm leading-5 text-[#647475]">
        Already have an account?{' '}
        <Text className="font-extrabold text-[#0B7A75]" onPress={onSignIn}>
          Sign in
        </Text>
      </Text>
    </>
  );
}
