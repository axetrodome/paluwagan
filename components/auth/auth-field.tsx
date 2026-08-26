import { Text, TextInput, View } from 'react-native';

type AuthFieldProps = React.ComponentProps<typeof TextInput> & {
  label: string;
};

export function AuthField({ label, ...inputProps }: AuthFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-[#294243]">{label}</Text>
      <TextInput
        {...inputProps}
        className="min-h-[52px] rounded-xl border border-[#DCE4E1] bg-[#F7F9F8] px-3.5 text-base text-[#173334]"
        placeholderTextColor="#8E9A9A"
        selectionColor="#0B7A75"
      />
    </View>
  );
}
