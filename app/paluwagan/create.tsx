import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { TopNav } from '../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { createPaluwagan, PALUWAGAN_FREQUENCIES } from '../../services/paluwagan';
import { useAuthStore } from '../../stores/auth-store';

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function CreatePaluwaganScreen() {
  const user = useAuthStore((state) => state.user);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [frequency, setFrequency] = useState<(typeof PALUWAGAN_FREQUENCIES)[number]>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  async function onSubmit() {
    if (!user) {
      Alert.alert('Please sign in', 'You need to be signed in to create a Paluwagan.');
      return;
    }

    try {
      setSaving(true);
      await createPaluwagan(
        {
          name,
          description,
          contribution_amount: contributionAmount,
          frequency,
          start_date: formatDateForInput(startDate),
        },
        user,
      );
      Alert.alert('Paluwagan created', 'Your group is ready to manage.');
      router.replace('/(tabs)');
    } catch (error: any) {
      reportError(error, { screen: 'paluwagan-create' });
      Alert.alert('Could not create Paluwagan', getFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={styles.safeArea}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <TopNav />

        <Text className="text-[30px] font-black text-[#173334]">Create Paluwagan</Text>
        <Text className="mt-2 text-base leading-6 text-[#647475]">
          Set up your group, contribution amount, and schedule.
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
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.7}
                    onPress={() => setFrequency(option)}
                    className={[
                      'mr-2 mb-2 rounded-xl border px-3 py-2.5',
                      selected ? 'border-[#0B7A75] bg-[#E8F4F2]' : 'border-[#D7E7E5] bg-white',
                    ].join(' ')}
                  >
                    <Text className={selected ? 'text-sm font-bold text-[#0B7A75]' : 'text-sm font-bold text-[#173334]'}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-5">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Start date
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3"
            >
              <Text className="text-base text-[#173334]">{formatDateForInput(startDate)}</Text>
            </TouchableOpacity>

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

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSubmit}
            disabled={saving}
            className="mt-2 w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">
              {saving ? 'Creating...' : 'Create Paluwagan'}
            </Text>
          </TouchableOpacity>
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
});
