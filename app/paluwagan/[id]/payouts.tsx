import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import { getPaluwaganById } from '../../../services/paluwagan';
import { generatePayoutOrdersForPaluwagan, listPayoutsForPaluwagan, type PayoutRecord, updatePayoutStatus } from '../../../services/payouts';
import { useAuthStore } from '../../../stores/auth-store';

export default function PaluwaganPayoutsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingPayoutId, setUpdatingPayoutId] = useState<number | null>(null);
  const [paluwaganId, setPaluwaganId] = useState<string | null>(null);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const paluwagan = await getPaluwaganById(id as string);
        setPaluwaganId(paluwagan?.id ?? null);

        if (paluwagan?.id) {
          const nextPayouts = await listPayoutsForPaluwagan(paluwagan.id);
          setPayouts(nextPayouts);
        }
      } catch (error: any) {
        reportError(error, { screen: 'payouts-load' });
        Alert.alert('Could not load payouts', getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  async function handleGeneratePayouts() {
    if (!user || !paluwaganId) {
      Alert.alert('Unable to generate payouts', 'Please sign in and open a valid Paluwagan.');
      return;
    }

    Alert.alert(
      'Generate payouts?',
      'This will recreate payout positions for active members. Old unpaid payouts will be removed and reset, while payouts already marked as paid/completed stay saved. New members added later can be generated again when needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate payouts',
          style: 'default',
          onPress: async () => {
            try {
              setGenerating(true);
              const nextPayouts = await generatePayoutOrdersForPaluwagan(paluwaganId, user.id);
              setPayouts(nextPayouts);
              Alert.alert('Payouts generated', 'New payout positions were created for active members.');
            } catch (error: any) {
              reportError(error, { screen: 'payouts-generate' });
              Alert.alert('Could not generate payouts', getFriendlyErrorMessage(error));
            } finally {
              setGenerating(false);
            }
          },
        },
      ],
    );
  }

  async function handleTogglePayoutStatus(payout: PayoutRecord) {
    if (!user || !paluwaganId) {
      return;
    }

    const nextStatus = payout.status === 'completed' ? 'scheduled' : 'completed';
    setUpdatingPayoutId(payout.id);

    try {
      const updated = await updatePayoutStatus(payout.id, user.id, nextStatus);
      setPayouts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      Alert.alert(
        nextStatus === 'completed' ? 'Payout marked complete' : 'Payout reset to scheduled',
        nextStatus === 'completed'
          ? `${updated.recipient_name ?? 'Member'} is now marked as completed.`
          : `${updated.recipient_name ?? 'Member'} was moved back to scheduled.`,
      );
    } catch (error: any) {
      reportError(error, { screen: 'payouts-toggle-status' });
      Alert.alert('Could not update payout status', getFriendlyErrorMessage(error));
    } finally {
      setUpdatingPayoutId((current) => (current === payout.id ? null : current));
    }
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6F5F0]">
        <View className="flex-1 items-center justify-center bg-[#F6F5F0] p-6">
          <Text className="text-base font-bold text-[#173334]">Please sign in to continue.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6F5F0]">
        <View className="flex-1 items-center justify-center bg-[#F6F5F0] p-6">
          <ActivityIndicator size="large" color="#0B7A75" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} stickyHeaderIndices={[0]}>
        <TopNav />

        <Text className="text-[30px] font-black text-[#173334]">Payouts</Text>
        <Text className="mt-2 text-base leading-6 text-[#647475]">
          Generate the payout order for active members and keep the upcoming schedule visible.
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleGeneratePayouts}
          disabled={generating}
          className="mt-5 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
        >
          <Text className="text-base font-extrabold text-white">
            {generating ? 'Generating payouts...' : 'Generate payouts'}
          </Text>
        </TouchableOpacity>

        {payouts.length === 0 ? (
          <View className="mt-6 rounded-[22px] border border-dashed border-[#C9D8D5] bg-white p-5">
            <Text className="text-base font-extrabold text-[#173334]">No payout orders yet</Text>
            <Text className="mt-2 text-sm text-[#647475]">
              Generate payouts to assign random positions and schedule amounts for active members.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-3">
            {payouts.map((payout) => (
              <View key={String(payout.id)} className="rounded-[22px] border border-[#D7E7E5] bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-extrabold text-[#173334]">Payout #{payout.payout_position}</Text>
                  <Text
                    className={[
                      'text-[10px] font-extrabold uppercase tracking-[1.2px]',
                      payout.status === 'completed' ? 'text-[#0B7A75]' : 'text-[#D97706]',
                    ].join(' ')}
                  >
                    {payout.status}
                  </Text>
                </View>

                <Text className="mt-2 text-sm text-[#647475]">Member: {payout.recipient_name ?? 'Member'}</Text>
                <Text className="mt-1 text-sm text-[#647475]">Amount: ₱{(Number(payout.amount) / 100).toFixed(2)}</Text>
                <Text className="mt-1 text-sm text-[#647475]">
                  Scheduled for: {new Date(`${payout.scheduled_for}T12:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleTogglePayoutStatus(payout)}
                  disabled={updatingPayoutId === payout.id}
                  className={[
                    'mt-4 min-h-[44px] items-center justify-center rounded-2xl px-3',
                    payout.status === 'completed' ? 'border border-[#D7E7E5] bg-[#EEF4F3]' : 'bg-[#0B7A75]',
                    updatingPayoutId === payout.id ? 'opacity-60' : 'opacity-100',
                  ].join(' ')}
                >
                  <Text className={[
                    'text-sm font-extrabold uppercase',
                    payout.status === 'completed' ? 'text-[#173334]' : 'text-white',
                  ].join(' ')}>
                    {updatingPayoutId === payout.id
                      ? payout.status === 'completed'
                        ? 'Resetting...'
                        : 'Completing...'
                      : payout.status === 'completed'
                        ? 'Set as scheduled'
                        : 'Mark complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
