import { FontAwesome5 } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AuthField } from './auth-field';

type SignInFormProps = {
  email: string;
  password: string;
  submitting: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onForgotPassword: () => void;
  showResendConfirmation: boolean;
  onResendConfirmation: () => void;
  onSignUp: () => void;
};

export function SignInForm({
  email,
  password,
  submitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
  showResendConfirmation,
  onResendConfirmation,
  onSignUp,
}: SignInFormProps) {
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
      <AuthField
        label="Password"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={submitting}
        onPress={onGoogleSignIn}
        className="mb-4 min-h-[52px] flex-row items-center justify-center rounded-xl border border-[#DADCE0] bg-white active:opacity-70"
      >
        <View className="flex-row items-center">
          <FontAwesome5 name="google" size={17} color="#4285F4" />
          <Text className="ml-3 text-base font-bold text-[#3C4043]">Continue with Google</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={onSubmit}
        className="min-h-[54px] items-center justify-center rounded-xl bg-[#0B7A75] active:opacity-70"
      >
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Sign in</Text>}
      </Pressable>
      <Pressable onPress={onForgotPassword} className="self-center py-4 active:opacity-70">
        <Text className="text-sm font-bold text-[#0B7A75]">Forgot your password?</Text>
      </Pressable>
      {showResendConfirmation && (
        <Pressable onPress={onResendConfirmation} className="self-center pb-4 active:opacity-70">
          <Text className="text-sm font-bold text-[#0B7A75]">Resend confirmation email</Text>
        </Pressable>
      )}
      <Text className="text-center text-sm leading-5 text-[#647475]">
        New to Paluwagan?{' '}
        <Text className="font-extrabold text-[#0B7A75]" onPress={onSignUp}>
          Create an account
        </Text>
      </Text>
    </>
  );
}
