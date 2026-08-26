import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getInitials, getProfileByUserId, updateProfileDisplayName } from '../../services/profile';
import { useAuthStore } from '../../stores/auth-store';

export default function ProfileTab() {
  const { user } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/auth/sign-in');
      return;
    }

    const activeUser = user!;

    async function loadProfile() {
      setLoading(true);
      const profile = await getProfileByUserId(activeUser.id);
      const nextName =
        profile?.display_name ??
        activeUser.user_metadata?.display_name ??
        activeUser.user_metadata?.full_name ??
        activeUser.email?.split('@')[0] ??
        'Member';
      setDisplayName(nextName);
      setProfileName(nextName);
      setProfileImage(profile?.avatar_url ?? activeUser.user_metadata?.avatar_url ?? null);
      setLoading(false);
    }

    void loadProfile();
  }, [user]);

  const initials = getInitials(profileName || displayName, user?.email ?? null);

  async function handleSave() {
    if (!user) return;
    const activeUser = user!;
    const trimmed = displayName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }

    setSaving(true);
    const updated = await updateProfileDisplayName(activeUser.id, trimmed);
    if (!updated) {
      Alert.alert('Could not update profile', 'Please try again.');
      setSaving(false);
      return;
    }

    setProfileName(updated.display_name ?? trimmed);
    setDisplayName(updated.display_name ?? trimmed);
    setSaving(false);
    Alert.alert('Profile updated', 'Your display name was saved.');
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F6F5F0]">
        <ActivityIndicator size="large" color="#0B7A75" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={{ flex: 1, backgroundColor: '#F6F5F0' }}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Text className="mb-6 text-2xl font-extrabold text-[#173334]">Profile</Text>

        <View className="items-center">
          {profileImage ? (
            <Image source={{ uri: profileImage }} className="h-28 w-28 rounded-full" />
          ) : (
            <View className="h-28 w-28 items-center justify-center rounded-full bg-[#0B7A75]">
              <Text className="text-3xl font-extrabold text-white">{initials}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View className="mt-8 items-center justify-center py-12">
            <ActivityIndicator size="small" color="#0B7A75" />
            <Text className="mt-3 text-sm text-[#647475]">Loading profile...</Text>
          </View>
        ) : (
          <View className="mt-8 gap-5">
            <View>
              <Text className="mb-2 text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Display name</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                autoCapitalize="words"
                className="rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
              />
            </View>

            <View className="rounded-2xl bg-[#E8F4F2] p-4">
              <Text className="mb-1 text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Email</Text>
              <Text className="text-base font-semibold text-[#173334]">{user.email ?? 'No email available'}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={saving}
              className="mt-2 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
            >
              <Text className="text-base font-extrabold text-white">{saving ? 'Saving...' : 'Save changes'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
