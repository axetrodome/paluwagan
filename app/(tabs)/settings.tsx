import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

import { resetAnalytics } from '../../lib/analytics';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { deleteOwnAccount } from '../../services/account';
import { useAuthStore } from '../../stores/auth-store';

export default function SettingsTab() {
  const setSession = useAuthStore((state) => state.setSession);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) {
            Alert.alert('Missing configuration', 'Add your Supabase environment variables to sign out.');
            return;
          }

          const { error } = await supabase.auth.signOut();
          if (error) {
            reportError(error, { screen: 'settings-sign-out' });
            Alert.alert('Could not sign out', getFriendlyErrorMessage(error));
            return;
          }

          setSession(null);
          router.replace('/auth/sign-in');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your login and any Paluwagans you organize. Contribution and payout records you left in groups you joined will remain as part of the organizer\u2019s history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            if (!supabase) {
              Alert.alert('Missing configuration', 'Add your Supabase environment variables to continue.');
              return;
            }

            setDeletingAccount(true);
            try {
              await deleteOwnAccount();
              resetAnalytics();
              setSession(null);
              router.replace({
                pathname: '/auth/sign-in',
                params: { notice: 'Your account has been deleted.' },
              });
            } catch (error) {
              reportError(error, { screen: 'settings-delete-account' });
              Alert.alert('Could not delete account', getFriendlyErrorMessage(error));
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <View className="flex-1 p-6">
        <Text className="mb-6 text-2xl font-extrabold text-[#173334]">Settings</Text>

        <View className="rounded-[22px] bg-white p-5 shadow-sm">
          <Text className="mb-2 text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Account</Text>
          <Text className="text-base font-semibold text-[#173334]">Manage your Paluwagan account</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSignOut}
            className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">Sign out</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 rounded-[22px] border border-[#F3C9C0] bg-white p-5 shadow-sm">
          <Text className="mb-2 text-xs font-bold uppercase tracking-[1.2px] text-[#A54222]">Danger zone</Text>
          <Text className="text-base font-semibold text-[#173334]">Delete your account</Text>
          <Text className="mt-1 text-sm leading-5 text-[#647475]">
            Permanently remove your login and the Paluwagans you organize.
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-[#A54222]"
          >
            {deletingAccount ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-base font-extrabold text-white">Delete account</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
