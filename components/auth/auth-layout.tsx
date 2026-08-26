import { Text, View } from 'react-native';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  message?: string | null;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, message, children }: AuthLayoutProps) {
  return (
    <View className="p-6 pt-16" style={{ padding: 24, paddingTop: 64 }}>
      <View className="mb-7">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-[18px] bg-[#0B7A75]">
          <Text className="text-[28px] font-extrabold text-white">₱</Text>
        </View>
        <Text className="mb-2 text-xs font-extrabold tracking-[1.3px] text-[#0B7A75]">
          PALUWAGAN MANAGER
        </Text>
        <Text className="text-[32px] font-extrabold leading-[38px] text-[#173334]">{title}</Text>
        <Text className="mt-2.5 text-base leading-[23px] text-[#647475]">{subtitle}</Text>
      </View>
      <View className="rounded-3xl border border-[#E4E7E4] bg-white p-5">
        {children}
      </View>
      {message && <Text className="mt-3.5 text-sm leading-5 text-[#A54222]">{message}</Text>}
    </View>
  );
}
