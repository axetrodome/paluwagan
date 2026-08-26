import * as ImagePicker from 'expo-image-picker';
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

import { PeriodMemberRow } from '../../../components/periods/period-member-row';
import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import {
  closeContributionPeriod,
  getContributionPeriodById,
  getContributionProofUrl,
  listContributionPeriodMembers,
  type ContributionPeriodRecord,
  type ContributionRecord,
  updateContributionRecord,
  uploadContributionProof,
} from '../../../services/contributions';
import { listPayoutsForPaluwagan, markPayoutAsPaid, type PayoutRecord } from '../../../services/payouts';
import { useAuthStore } from '../../../stores/auth-store';

export default function ContributionPeriodDetailScreen() {
  const { id, periodId } = useLocalSearchParams<{ id?: string; periodId?: string }>();
  const user = useAuthStore((state) => state.user);

  const paluwaganId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;
  const targetPeriodId = typeof periodId === 'string' ? periodId : Array.isArray(periodId) ? periodId[0] : undefined;

  const [loading, setLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);
  const [closingPayoutId, setClosingPayoutId] = useState<number | null>(null);
  const [closingPeriodId, setClosingPeriodId] = useState<number | null>(null);
  const [savedMemberId, setSavedMemberId] = useState<number | null>(null);
  const [uploadingProofMemberId, setUploadingProofMemberId] = useState<number | null>(null);
  const [period, setPeriod] = useState<ContributionPeriodRecord | null>(null);
  const [members, setMembers] = useState<ContributionRecord[]>([]);
  const [payoutRecipient, setPayoutRecipient] = useState<PayoutRecord | null>(null);
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const allMembersPaid = members.length > 0 && members.every((member) => member.status === 'paid' || member.amount_paid >= member.amount_due);

  const summaryItems = members.reduce(
    (acc, member) => {
      const status =
        member.status === 'paid' || member.amount_paid >= member.amount_due
          ? 'paid'
          : member.status === 'partial' || member.status === 'submitted' || member.amount_paid > 0
            ? 'partial'
            : 'unpaid';

      if (status === 'paid') acc.paid += 1;
      if (status === 'partial') acc.partial += 1;
      if (status === 'unpaid') acc.unpaid += 1;

      return acc;
    },
    { paid: 0, partial: 0, unpaid: 0 },
  );

  const totalCollected = members.reduce((sum, member) => sum + member.amount_paid, 0);
  const isPeriodClosed = period?.status === 'closed';
  const canClosePeriod = !isPeriodClosed && allMembersPaid && !!payoutRecipient && payoutRecipient.status !== 'completed';
  const canMarkPayoutAsPaid = isPeriodClosed && !!payoutRecipient && payoutRecipient.status !== 'completed';

  useEffect(() => {
    if (!paluwaganId || !targetPeriodId) {
      setLoading(false);
      return;
    }

    const safePaluwaganId = paluwaganId;
    const safeTargetPeriodId = Number(targetPeriodId);

    async function load() {
      setLoading(true);
      try {
        const nextPeriod = await getContributionPeriodById(safePaluwaganId, safeTargetPeriodId);
        setPeriod(nextPeriod);

        if (nextPeriod) {
          const nextMembers = await listContributionPeriodMembers(safePaluwaganId, nextPeriod.id);
          const nextProofUrls: Record<string, string> = {};

          for (const member of nextMembers) {
            const url = await getContributionProofUrl(member.proof_path);
            if (url) {
              nextProofUrls[String(member.id)] = url;
            }
          }

          const nextPayouts = await listPayoutsForPaluwagan(safePaluwaganId);
          const nextRecipient = selectPayoutForCurrentPeriod(nextPeriod.period_number, nextPayouts);

          setMembers(nextMembers);
          setPayoutRecipient(nextRecipient);
          setProofUrls(nextProofUrls);
          syncContributionInputs(nextMembers);
        }
      } catch (error: any) {
        reportError(error, { screen: 'period-detail-load' });
        Alert.alert('Could not load period details', getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [paluwaganId, targetPeriodId]);

  function syncContributionInputs(nextMembers: ContributionRecord[]) {
    const nextAmounts: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};

    for (const member of nextMembers) {
      nextAmounts[String(member.id)] = (member.amount_paid / 100).toFixed(2);
      nextNotes[String(member.id)] = member.notes ?? '';
    }

    setAmountInputs(nextAmounts);
    setNoteInputs(nextNotes);
  }

  function handleAmountChange(memberId: number, nextValue: string) {
    setAmountInputs((current) => ({ ...current, [String(memberId)]: nextValue }));
  }

  function handleNoteChange(memberId: number, nextValue: string) {
    setNoteInputs((current) => ({ ...current, [String(memberId)]: nextValue }));
  }

  function handlePreset(memberId: number, presetValue: number, currentNote: string) {
    const nextAmount = Number(presetValue) / 100;
    setAmountInputs((current) => ({ ...current, [String(memberId)]: nextAmount.toFixed(2) }));

    if (presetValue === 0) {
      setNoteInputs((current) => ({ ...current, [String(memberId)]: current[String(memberId)] ?? currentNote }));
    }
  }

  function selectPayoutForCurrentPeriod(periodNumber: number | null | undefined, payouts: PayoutRecord[]) {
    if (!periodNumber) {
      return payouts[0] ?? null;
    }

    return payouts.find((payout) => payout.payout_position === Number(periodNumber)) ?? payouts[0] ?? null;
  }

  async function handleContributionUpdate(member: ContributionRecord, nextAmountPaid: number, notes?: string | null) {
    if (isPeriodClosed) {
      Alert.alert('Period closed', 'This period is read-only and cannot be edited anymore.');
      return;
    }

    setSavingMemberId(member.id);
    setSavedMemberId((current) => (current === member.id ? null : current));

    try {
      const nextStatus =
        nextAmountPaid <= 0 ? 'unpaid' : nextAmountPaid >= member.amount_due ? 'paid' : 'partial';

      const updated = await updateContributionRecord(member.id, {
        amount_due: member.amount_due,
        amount_paid: nextAmountPaid,
        status: nextStatus,
        notes: notes ?? member.notes ?? null,
        paid_at: nextAmountPaid > 0 ? new Date().toISOString() : null,
      });

      const refreshedMembers = members.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
      setMembers(refreshedMembers);
      setAmountInputs((current) => ({ ...current, [String(member.id)]: (updated.amount_paid / 100).toFixed(2) }));
      setNoteInputs((current) => ({ ...current, [String(member.id)]: updated.notes ?? '' }));
      setSavedMemberId(member.id);

      const allPaidNow = refreshedMembers.length > 0 && refreshedMembers.every((item) => item.status === 'paid' || item.amount_paid >= item.amount_due);
      if (allPaidNow && paluwaganId) {
        const payouts = await listPayoutsForPaluwagan(paluwaganId);
        setPayoutRecipient(selectPayoutForCurrentPeriod(period?.period_number, payouts));
      }

      setTimeout(() => {
        setSavedMemberId((current) => (current === member.id ? null : current));
      }, 1400);
    } catch (error: any) {
      reportError(error, { screen: 'period-detail-update-contribution' });
      Alert.alert('Could not save contribution', getFriendlyErrorMessage(error));
    } finally {
      setSavingMemberId((current) => (current === member.id ? null : current));
    }
  }

  async function handleMarkPayoutAsPaid() {
    if (!payoutRecipient || !user || !paluwaganId) {
      return;
    }

    setClosingPayoutId(payoutRecipient.id);

    try {
      const closed = await markPayoutAsPaid(payoutRecipient.id, user.id);
      const nextPayouts = await listPayoutsForPaluwagan(paluwaganId);
      setPayoutRecipient(selectPayoutForCurrentPeriod(period?.period_number, nextPayouts));
      Alert.alert('Payout completed', `${closed.recipient_name ?? 'Member'} was marked as completed.`);
    } catch (error: any) {
      reportError(error, { screen: 'period-detail-mark-payout-paid' });
      Alert.alert('Could not complete payout', getFriendlyErrorMessage(error));
    } finally {
      setClosingPayoutId((current) => (current === payoutRecipient.id ? null : current));
    }
  }

  async function handleClosePeriod() {
    if (!paluwaganId || !period || !user) {
      return;
    }

    Alert.alert(
      'Close period?',
      'This will lock the period and make all contribution edits read-only. You can mark the payout as paid after closing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close period',
          style: 'destructive',
          onPress: async () => {
            setClosingPeriodId(period.id);

            try {
              const updatedPeriod = await closeContributionPeriod(paluwaganId, user.id, period.id);
              setPeriod(updatedPeriod);
              Alert.alert('Period closed', 'This period is now read-only and contribution edits are locked.');
            } catch (error: any) {
              reportError(error, { screen: 'period-detail-close-period' });
              Alert.alert('Could not close period', getFriendlyErrorMessage(error));
            } finally {
              setClosingPeriodId((current) => (current === period.id ? null : current));
            }
          },
        },
      ],
    );
  }

  async function handleUploadProof(member: ContributionRecord) {
    if (!paluwaganId || !targetPeriodId) {
      return;
    }

    if (isPeriodClosed) {
      Alert.alert('Period closed', 'This period is read-only and cannot accept new proof uploads.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setUploadingProofMemberId(member.id);
      const asset = result.assets[0];
      const fileName = `${member.member_name || 'payment'}-${member.id}-${Date.now()}`;
      const uploaded = await uploadContributionProof({
        contributionId: member.id,
        paluwaganId,
        periodId: targetPeriodId,
        fileUri: asset.uri,
        fileName,
        fileType: asset.mimeType ?? 'image/jpeg',
        fileBase64: asset.base64,
      });

      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? { ...item, proof_path: uploaded.path, status: uploaded.updated.status }
            : item,
        ),
      );

      if (uploaded.publicUrl) {
        setProofUrls((current) => ({ ...current, [String(member.id)]: uploaded.publicUrl! }));
      }

      Alert.alert('Payment proof uploaded', 'Your proof has been saved to Supabase Storage.');
    } catch (error: any) {
      reportError(error, { screen: 'period-detail-upload-proof' });
      Alert.alert('Could not upload proof', getFriendlyErrorMessage(error));
    } finally {
      setUploadingProofMemberId((current) => (current === member.id ? null : current));
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6F5F0]">
        <View className="flex-1 items-center justify-center bg-[#F6F5F0]">
          <ActivityIndicator size="large" color="#0B7A75" />
        </View>
      </SafeAreaView>
    );
  }

  if (!paluwaganId || !targetPeriodId || !period) {
    return (
      <SafeAreaView className="flex-1 bg-[#F6F5F0]">
        <View className="flex-1 items-center justify-center bg-[#F6F5F0] p-6">
          <Text className="text-xl font-extrabold text-[#173334]">Period not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 40 }} stickyHeaderIndices={[0]}>
        <TopNav />

        <View className="mb-5">
          <Text className="text-[30px] font-black text-[#173334]">Period {period.period_number}</Text>
          <Text className="mt-2 text-base text-[#647475]">
            Due date: {new Date(`${period.due_date}T12:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' })}
          </Text>
          <Text className="mt-1 text-base text-[#647475]">Amount due: ₱{(period.amount_due / 100).toFixed(2)}</Text>
        </View>

        <View className="mb-4 rounded-[22px] border border-[#D7E7E5] bg-white p-4">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">Period summary</Text>
          <Text className="mt-2 text-[22px] font-black text-[#173334]">Total collected: ₱{(totalCollected / 100).toFixed(2)}</Text>

          {payoutRecipient ? (
            <View className="mt-4 flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                  {isPeriodClosed ? 'Payout recipient' : 'Next payout recipient'}
                </Text>
                <Text className="mt-1 text-base font-extrabold text-[#173334]">{payoutRecipient.recipient_name ?? 'Member'}</Text>
                <Text className="mt-1 text-sm text-[#647475]">Payout #{payoutRecipient.payout_position} • ₱{(payoutRecipient.amount / 100).toFixed(2)}</Text>
              </View>

              {payoutRecipient.status === 'completed' ? (
                <View className="rounded-2xl border border-[#D7E7E5] bg-[#E8F4F2] px-3 py-2">
                  <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#0B7A75]">Completed</Text>
                </View>
              ) : canMarkPayoutAsPaid ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleMarkPayoutAsPaid}
                  disabled={closingPayoutId === payoutRecipient.id}
                  className={[
                    'rounded-2xl bg-[#0B7A75] px-3 py-2',
                    closingPayoutId === payoutRecipient.id ? 'opacity-60' : 'opacity-100',
                  ].join(' ')}
                >
                  <Text className="text-xs font-extrabold uppercase text-white">
                    {closingPayoutId === payoutRecipient.id ? 'Completing...' : 'Mark complete'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {canClosePeriod ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleClosePeriod}
              disabled={closingPeriodId === period.id}
              className={[
                'mt-4 rounded-2xl bg-[#173334] px-4 py-3',
                closingPeriodId === period.id ? 'opacity-70' : 'opacity-100',
              ].join(' ')}
            >
              <Text className="text-center text-sm font-extrabold uppercase text-white">
                {closingPeriodId === period.id ? 'Closing period...' : 'Close period'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isPeriodClosed ? (
            <View className="mt-4 rounded-2xl border border-[#D7E7E5] bg-[#EEF4F3] px-3 py-2">
              <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">Status</Text>
              <Text className="mt-1 text-sm font-bold text-[#173334]">Period closed — read only</Text>
            </View>
          ) : null}
        </View>

        <View className="bg-transparent">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Members for this period
            </Text>
            <Text className="text-[10px] font-black uppercase text-[#647475]">
              {members.length} total
            </Text>
          </View>

          <View className="mb-4 gap-3">
            <View className="flex-row gap-2">
              {[
                { label: 'Paid', value: summaryItems.paid, tone: 'bg-[#E8F4F2] border-[#CFE8E2]' },
                { label: 'Partial', value: summaryItems.partial, tone: 'bg-[#FFF4D8] border-[#F3E4B1]' },
                { label: 'Unpaid', value: summaryItems.unpaid, tone: 'bg-[#EEF4F3] border-[#D7E7E5]' },
              ].map((item) => (
                <View key={item.label} className={['flex-1 rounded-[18px] border p-3', item.tone].join(' ')}>
                  <Text className="text-[9px] font-black uppercase tracking-[1.2px] text-[#647475]">{item.label}</Text>
                  <Text className="mt-1 text-xl font-extrabold text-[#173334]">{item.value}</Text>
                </View>
              ))}
            </View>

            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#647475]">
              {members.length} members • Total collected: ₱{(totalCollected / 100).toFixed(2)}
            </Text>
          </View>

          {members.length === 0 ? (
            <View className="rounded-[18px] border border-dashed border-[#C9D8D5] bg-[#F8F9F7] p-4">
              <Text className="text-base font-extrabold text-[#173334]">No records yet</Text>
              <Text className="mt-1 text-sm text-[#647475]">Contribution records will appear here once members are added to this period.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {members.map((member) => {
                const amountKey = String(member.id);
                const amountValue = amountInputs[amountKey] ?? (member.amount_paid / 100).toFixed(2);
                const noteValue = noteInputs[amountKey] ?? member.notes ?? '';

                return (
                  <PeriodMemberRow
                    key={amountKey}
                    member={member}
                    amountValue={amountValue}
                    noteValue={noteValue}
                    savingMemberId={savingMemberId}
                    savedMemberId={savedMemberId}
                    uploadingProofMemberId={uploadingProofMemberId}
                    proofUrl={proofUrls[String(member.id)] ?? null}
                    isReadOnly={isPeriodClosed}
                    onAmountChange={handleAmountChange}
                    onNoteChange={handleNoteChange}
                    onPreset={handlePreset}
                    onUploadProof={handleUploadProof}
                    onSave={async (currentMember, amountText, currentNoteText) => {
                      const nextAmount = Number.parseFloat(amountText || '0');
                      const nextPaidInCentavos = Math.max(0, Math.round((Number.isFinite(nextAmount) ? nextAmount : 0) * 100));
                      await handleContributionUpdate(currentMember, nextPaidInCentavos, currentNoteText);
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
