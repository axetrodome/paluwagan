import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import {
  CONTRIBUTION_PERIOD_STATUSES,
  createContributionPeriod,
  getContributionPeriodById,
  getNextPeriodNumber,
  type ContributionPeriodStatus,
  updateContributionPeriod,
} from '../../../services/contributions';
import { getPaluwaganById, type PaluwaganRecord } from '../../../services/paluwagan';
import { useAuthStore } from '../../../stores/auth-store';

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function CreateContributionPeriodScreen() {
  const { id, periodId, mode } = useLocalSearchParams<{ id?: string; periodId?: string; mode?: string }>();
  const user = useAuthStore((state) => state.user);

  const paluwaganId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;
  const targetPeriodId = typeof periodId === 'string' ? periodId : Array.isArray(periodId) ? periodId[0] : undefined;
  const isEditing = mode === 'edit' && !!targetPeriodId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paluwagan, setPaluwagan] = useState<PaluwaganRecord | null>(null);
  const [periodNumber, setPeriodNumber] = useState('1');
  const [dueDate, setDueDate] = useState(new Date());
  const [amountDue, setAmountDue] = useState('');
  const [status, setStatus] = useState<ContributionPeriodStatus>('open');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!paluwaganId) {
      setLoading(false);
      return;
    }

    const currentPaluwaganId = paluwaganId;

    async function load() {
      setLoading(true);
      try {
        const item = await getPaluwaganById(currentPaluwaganId);
        setPaluwagan(item);

        if (!item) {
          return;
        }

        if (isEditing && targetPeriodId) {
          const existingPeriod = await getContributionPeriodById(currentPaluwaganId, targetPeriodId);

          if (existingPeriod) {
            setPeriodNumber(String(existingPeriod.period_number));
            setAmountDue(String(existingPeriod.amount_due / 100));
            setStatus(existingPeriod.status);
            setDueDate(new Date(`${existingPeriod.due_date}T12:00:00`));
            return;
          }
        }

        const nextPeriodNumber = await getNextPeriodNumber(item.id);
        setPeriodNumber(String(nextPeriodNumber));
        setAmountDue(String(Math.round(item.contribution_amount / 100)));

        const nextDueDate = new Date(item.start_date);
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        setDueDate(nextDueDate);
      } catch (error: any) {
        reportError(error, { screen: 'period-create-load' });
        Alert.alert('Could not load Paluwagan', getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [isEditing, paluwaganId, targetPeriodId]);

  async function onSubmit() {
    if (!user || !paluwaganId || !paluwagan) {
      Alert.alert('Sign in required', 'You need to be signed in to create a period.');
      return;
    }

    const trimmedPeriodNumber = periodNumber.trim();
    if (!trimmedPeriodNumber || Number(trimmedPeriodNumber) <= 0) {
      Alert.alert('Invalid period number', 'Please provide a valid period number.');
      return;
    }

    if (!amountDue || Number(amountDue) <= 0) {
      Alert.alert('Invalid amount', 'Amount due must be greater than zero.');
      return;
    }

    try {
      setSaving(true);

      if (isEditing && targetPeriodId) {
        await updateContributionPeriod(paluwaganId, user.id, targetPeriodId, {
          period_number: trimmedPeriodNumber,
          due_date: formatDateForInput(dueDate),
          amount_due: amountDue,
          status,
        });

        Alert.alert('Period updated', 'The contribution period was updated successfully.');
      } else {
        await createContributionPeriod(paluwaganId, user.id, {
          period_number: trimmedPeriodNumber,
          due_date: formatDateForInput(dueDate),
          amount_due: amountDue,
          status,
        });

        Alert.alert('Period created', 'The contribution period was created successfully.');
      }

      router.replace({ pathname: '/paluwagan/[id]/periods', params: { id: paluwaganId } });
    } catch (error: any) {
      reportError(error, { screen: 'period-create-submit' });
      Alert.alert(isEditing ? 'Could not update period' : 'Could not create period', getFriendlyErrorMessage(error));
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
          <ActivityIndicator size="large" color="#0B7A75" />
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
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <TopNav />

        <Text className="text-[30px] font-black text-[#173334]">
          {isEditing ? 'Edit contribution period' : 'Create contribution period'}
        </Text>
        <Text className="mt-2 text-base leading-6 text-[#647475]">
          {isEditing
            ? 'Update the cycle number, due date, and amount for this Paluwagan.'
            : 'Set the cycle number, due date, and amount for this Paluwagan.'}
        </Text>

        <View className="mt-6">
          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Period number
            </Text>
            <TextInput
              value={periodNumber}
              onChangeText={setPeriodNumber}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="1"
              placeholderTextColor="#7B8E8F"
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Due date
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowDatePicker(true)}
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3"
            >
              <Text className="text-base text-[#173334]">{formatDateForInput(dueDate)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDueDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Amount due
            </Text>
            <TextInput
              value={amountDue}
              onChangeText={(text) => {
                const sanitized = text.replace(/[^0-9]/g, '');
                setAmountDue(sanitized);
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="1000"
              placeholderTextColor="#7B8E8F"
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-white px-4 py-3 text-base text-[#173334]"
            />
          </View>

          <View className="mb-5">
            <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Status
            </Text>
            <View className="flex-row flex-wrap">
              {CONTRIBUTION_PERIOD_STATUSES.map((option) => {
                const selected = option === status;

                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.7}
                    onPress={() => setStatus(option)}
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

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSubmit}
            disabled={saving}
            className="mt-2 w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">
              {saving ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save changes' : 'Create period'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!paluwaganId) {
                return;
              }

              router.push({ pathname: '/paluwagan/[id]/periods', params: { id: paluwaganId } });
            }}
            className="mt-3 w-full min-h-[52px] items-center justify-center rounded-2xl border border-[#D7E7E5] bg-white"
          >
            <Text className="text-base font-extrabold text-[#173334]">View periods</Text>
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
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F5F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
});
