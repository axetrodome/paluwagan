import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import { getPaluwaganById, PALUWAGAN_FREQUENCIES, updatePaluwagan, type PaluwaganRecord } from '../../../services/paluwagan';
import { useAuthStore } from '../../../stores/auth-store';

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function EditPaluwaganScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paluwagan, setPaluwagan] = useState<PaluwaganRecord | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [frequency, setFrequency] = useState<(typeof PALUWAGAN_FREQUENCIES)[number]>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const item = await getPaluwaganById(id as string);

        if (!item) {
          setPaluwagan(null);
          return;
        }

        setPaluwagan(item);
        setName(item.name);
        setDescription(item.description ?? '');
        setContributionAmount(String(item.contribution_amount / 100));
        setFrequency((item.contribution_frequency ?? item.frequency ?? 'monthly') as (typeof PALUWAGAN_FREQUENCIES)[number]);
        setStartDate(new Date(item.start_date));
      } catch (error: any) {
        reportError(error, { screen: 'paluwagan-edit-load' });
        Alert.alert('Could not load Paluwagan', getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  async function onSubmit() {
    if (!user || !id || !paluwagan) {
      Alert.alert('Sign in required', 'You need to be signed in to edit a Paluwagan.');
      return;
    }

    try {
      setSaving(true);
      await updatePaluwagan(id as string, user.id, {
        name,
        description,
        contribution_amount: contributionAmount,
        frequency,
        start_date: formatDateForInput(startDate),
      });

      Alert.alert('Paluwagan updated', 'Your changes were saved.');
      router.replace({ pathname: '/paluwagan/[id]', params: { id } });
    } catch (error: any) {
      reportError(error, { screen: 'paluwagan-edit-save' });
      Alert.alert('Could not update Paluwagan', getFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text className="text-base font-bold text-[#173334]">Please sign in to continue.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text className="text-base font-bold text-[#173334]">Loading Paluwagan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paluwagan) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Text className="text-xl font-extrabold text-[#173334]">Paluwagan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <TopNav />

        <Text className="text-[30px] font-black text-[#173334]">Edit Paluwagan</Text>
        <Text className="mt-2 text-base leading-6 text-[#647475]">
          Update your group details and contribution settings.
        </Text>

        <View className="mt-6">
          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Paluwagan name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Family Savings"
              placeholderTextColor="#7B8E8F"
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Optional group notes"
              placeholderTextColor="#7B8E8F"
              multiline
              className="min-h-[96px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Contribution amount
            </Text>
            <TextInput
              value={contributionAmount}
              onChangeText={(text) => {
                const sanitized = text.replace(/[^0-9]/g, '');
                setContributionAmount(sanitized);
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="1000"
              placeholderTextColor="#7B8E8F"
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Frequency
            </Text>
            <View className="flex-row flex-wrap">
              {PALUWAGAN_FREQUENCIES.map((option) => {
                const selected = option === frequency;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setFrequency(option)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    className={[
                      'mr-2 mb-2 rounded-xl border px-3 py-2.5',
                      selected ? 'border-[#0B7A75] bg-[#E8F4F2]' : 'border-[#D7E7E5] bg-white',
                    ].join(' ')}
                  >
                    <Text className={selected ? 'text-sm font-bold text-[#0B7A75]' : 'text-sm font-bold text-[#173334]'}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mb-5">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Start date
            </Text>

            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3"
            >
              <Text className="text-base text-[#173334]">{formatDateForInput(startDate)}</Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setStartDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <Pressable onPress={onSubmit} disabled={saving} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]} className="mt-2 w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]">
            <Text className="text-base font-extrabold text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F5F0',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F6F5F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
});
