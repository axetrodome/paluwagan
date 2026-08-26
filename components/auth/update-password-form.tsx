import { ActivityIndicator, Pressable, Text } from 'react-native';

import { AuthField } from './auth-field';

type UpdatePasswordFormProps = {
  password: string;
  submitting: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onBackToSignIn: () => void;
};

export function UpdatePasswordForm({
  password,
  submitting,
  onPasswordChange,
  onSubmit,
  onBackToSignIn,
}: UpdatePasswordFormProps) {
  return (
    <>
      <AuthField
        label="New password"
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
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-base font-extrabold text-white">Update password</Text>}
      </Pressable>
      <Pressable onPress={onBackToSignIn} className="self-center py-4 active:opacity-70">
        <Text className="text-sm font-bold text-[#0B7A75]">Back to sign in</Text>
      </Pressable>
    </>
  );
}
