import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { TopNav } from '../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { listContributionPeriodMembers, listContributionPeriods, type ContributionPeriodRecord } from '../../services/contributions';
import { listPaluwaganMembers } from '../../services/members';
import { archivePaluwagan, formatPeso, getPaluwaganById, type PaluwaganRecord, unarchivePaluwagan } from '../../services/paluwagan';
import { listPayoutsForPaluwagan, type PayoutRecord } from '../../services/payouts';
import { useAuthStore } from '../../stores/auth-store';

type PeriodInsight = {
  totalMembers: number;
  paid: number;
  partial: number;
  unpaid: number;
  totalCollected: number;
};

export default function PaluwaganDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [paluwagan, setPaluwagan] = useState<PaluwaganRecord | null>(null);
  const [periods, setPeriods] = useState<ContributionPeriodRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [periodInsights, setPeriodInsights] = useState<Record<number, PeriodInsight>>({});
  const [memberSummary, setMemberSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [archiving, setArchiving] = useState(false);

  const refreshPaluwagan = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const item = await getPaluwaganById(id as string);
      setPaluwagan(item);

      if (item) {
        const nextPeriods = await listContributionPeriods(item.id);
        const nextPayouts = await listPayoutsForPaluwagan(item.id);
        const nextMembers = await listPaluwaganMembers(item.id);
        const nextMemberSummary = nextMembers.reduce(
          (acc, member) => {
            acc.total += 1;
            if (member.status === 'active') acc.active += 1;
            if (member.status === 'inactive') acc.inactive += 1;
            return acc;
          },
          { total: 0, active: 0, inactive: 0 },
        );

        const nextInsights = await Promise.all(
          nextPeriods.map(async (period) => {
            const members = await listContributionPeriodMembers(item.id, period.id);

            const insight = members.reduce(
              (acc, member) => {
                const status =
                  member.status === 'paid' || member.amount_paid >= member.amount_due
                    ? 'paid'
                    : member.status === 'partial' || member.amount_paid > 0
                      ? 'partial'
                      : 'unpaid';

                acc.totalMembers += 1;
                acc.totalCollected += member.amount_paid;

                if (status === 'paid') acc.paid += 1;
                if (status === 'partial') acc.partial += 1;
                if (status === 'unpaid') acc.unpaid += 1;

                return acc;
              },
              { totalMembers: 0, paid: 0, partial: 0, unpaid: 0, totalCollected: 0 },
            );

            return [period.id, insight] as const;
          }),
        );

        setPeriods(nextPeriods);
        setPayouts(nextPayouts);
        setPeriodInsights(Object.fromEntries(nextInsights));
        setMemberSummary(nextMemberSummary);
      } else {
        setPeriods([]);
        setPayouts([]);
        setPeriodInsights({});
        setMemberSummary({ total: 0, active: 0, inactive: 0 });
      }
    } catch (error) {
      reportError(error, { screen: 'paluwagan-detail' });
      setPaluwagan(null);
      setPeriods([]);
      setPayouts([]);
      setPeriodInsights({});
      setMemberSummary({ total: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refreshPaluwagan();
  }, [refreshPaluwagan]);

  useFocusEffect(
    useCallback(() => {
      void refreshPaluwagan();
    }, [refreshPaluwagan]),
  );

  async function handleArchiveToggle() {
    if (!user || !paluwagan) {
      return;
    }

    const isArchived = paluwagan.status === 'archived';
    const actionText = isArchived ? 'Unarchive' : 'Archive';

    Alert.alert(
      `${actionText} Paluwagan`,
      isArchived
        ? 'This will make the group visible in active lists again. Continue?'
        : 'This will hide the group from active lists. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isArchived ? 'default' : 'destructive',
          onPress: async () => {
            try {
              setArchiving(true);
              if (isArchived) {
                await unarchivePaluwagan(paluwagan.id, user.id);
                setPaluwagan((current) => (current ? { ...current, status: 'active' } : current));
                Alert.alert('Paluwagan restored', 'The group is active again.');
              } else {
                await archivePaluwagan(paluwagan.id, user.id);
                setPaluwagan((current) => (current ? { ...current, status: 'archived' } : current));
                Alert.alert('Paluwagan archived', 'The group is now archived.');
              }
            } catch (error: any) {
              reportError(error, { screen: 'paluwagan-detail-archive-toggle' });
              Alert.alert(
                `Could not ${actionText.toLowerCase()} Paluwagan`,
                getFriendlyErrorMessage(error),
              );
            } finally {
              setArchiving(false);
            }
          },
        },
      ],
    );
  }

  const openCreatePeriod = () => {
    if (!paluwagan) {
      return;
    }

    router.push({ pathname: '/paluwagan/[id]/period-create', params: { id: paluwagan.id } });
  };

  const openPeriodsList = () => {
    if (!paluwagan) {
      return;
    }

    router.push({ pathname: '/paluwagan/[id]/periods', params: { id: paluwagan.id } });
  };

  const openPayouts = () => {
    if (!paluwagan) {
      return;
    }

    router.push({ pathname: '/paluwagan/[id]/payouts', params: { id: paluwagan.id } });
  };

  const openPeriodDetail = (period: ContributionPeriodRecord) => {
    if (!paluwagan) {
      return;
    }

    router.push({
      pathname: '/paluwagan/[id]/period-detail',
      params: { id: paluwagan.id, periodId: String(period.id) },
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#0B7A75" />
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
        <View style={styles.notFoundContainer}>
          <Text className="text-center text-2xl font-extrabold text-[#173334]">Paluwagan not found</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="mt-6 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75] px-6"
          >
            <Text className="text-base font-extrabold text-white">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} stickyHeaderIndices={[0]}>
        <TopNav />

        <View className="rounded-[24px] bg-white p-5 shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Paluwagan</Text>
          <Text className="mt-2 text-3xl font-extrabold text-[#173334]">{paluwagan.name}</Text>
          {paluwagan.description ? (
            <Text className="mt-3 text-base leading-6 text-[#476263]">{paluwagan.description}</Text>
          ) : null}
        </View>

        <View className="mt-5 gap-3">
          <View className="rounded-[20px] bg-[#E8F4F2] p-4">
            <Text className="text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Contribution</Text>
            <Text className="mt-2 text-xl font-extrabold text-[#173334]">
              {formatPeso(paluwagan.contribution_amount)}
            </Text>
            <Text className="mt-1 text-sm text-[#476263]">{paluwagan.frequency}</Text>
          </View>

          <View className="rounded-[20px] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Members</Text>
            <Text className="mt-2 text-base font-semibold text-[#173334]">{memberSummary.total} total</Text>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <View className="rounded-full bg-[#E8F4F2] px-2.5 py-1.5">
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#173334]">
                  Active: {memberSummary.active}
                </Text>
              </View>

              <View className="rounded-full bg-[#EEF4F3] px-2.5 py-1.5">
                <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#173334]">
                  Inactive: {memberSummary.inactive}
                </Text>
              </View>
            </View>
          </View>

          <View className="rounded-[20px] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Start date</Text>
            <Text className="mt-2 text-base font-semibold text-[#173334]">{new Date(paluwagan.start_date).toLocaleDateString('en-PH', { dateStyle: 'long' })}</Text>
          </View>

          <View className="rounded-[20px] bg-white p-4">
            <Text className="text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">Status</Text>
            <Text className="mt-2 text-base font-semibold capitalize text-[#173334]">{paluwagan.status}</Text>
          </View>
        </View>

        {paluwagan.organizer_id === user.id ? (
          <View className="mt-6 rounded-[22px] bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                Contribution periods
              </Text>

              {periods.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openPeriodsList}
                  className="min-h-[42px] items-center justify-center rounded-xl bg-[#E8F4F2] px-3"
                >
                  <Text className="text-sm font-extrabold text-[#0B7A75]">View all periods</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {periods.length === 0 ? (
              <View className="mt-4 rounded-[18px] border border-dashed border-[#C9D8D5] bg-[#F8F9F7] p-4">
                <Text className="text-base font-extrabold text-[#173334]">No periods yet</Text>
                <Text className="mt-1 text-sm text-[#647475]">Create the first contribution cycle for this Paluwagan.</Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openCreatePeriod}
                  className="mt-4 min-h-[46px] items-center justify-center rounded-xl bg-[#0B7A75] px-3"
                >
                  <Text className="text-sm font-extrabold text-white">Create period</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                {periods.map((period) => {
                  const statusColor =
                    period.status === 'open'
                      ? 'text-[#0B7A75]'
                      : period.status === 'closed'
                        ? 'text-[#C94B4B]'
                        : 'text-[#B7791F]';

                  const insight = periodInsights[period.id] ?? {
                    totalMembers: 0,
                    paid: 0,
                    partial: 0,
                    unpaid: 0,
                    totalCollected: 0,
                  };
                  const payoutForPeriod =
                    period.status === 'closed'
                      ? payouts.find((payout) => payout.payout_position === Number(period.period_number)) ?? null
                      : null;

                  return (
                    <TouchableOpacity
                      key={String(period.id)}
                      activeOpacity={0.8}
                      onPress={() => openPeriodDetail(period)}
                      className="rounded-[18px] border border-[#D7E7E5] bg-[#F8F9F7] p-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-extrabold text-[#173334]">Period {period.period_number}</Text>
                        <Text className={['text-[10px] font-extrabold uppercase tracking-[1.2px]', statusColor].join(' ')}>
                          {period.status}
                        </Text>
                      </View>

                      <Text className="mt-2 text-sm text-[#647475]">
                        Due date: {new Date(`${period.due_date}T12:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' })}
                      </Text>
                      <Text className="mt-1 text-sm text-[#647475]">Amount due: {formatPeso(period.amount_due)}</Text>

                      <View className="mt-3 gap-2">
                        <View className="flex-row flex-wrap gap-2">
                          {[
                            { label: 'Paid', value: insight.paid, tone: 'bg-[#E8F4F2] border-[#CFE8E2]' },
                            { label: 'Partial', value: insight.partial, tone: 'bg-[#FFF4D8] border-[#F3E4B1]' },
                            { label: 'Unpaid', value: insight.unpaid, tone: 'bg-[#EEF4F3] border-[#D7E7E5]' },
                          ].map((item) => (
                            <View
                              key={item.label}
                              className={['rounded-full border px-2.5 py-1.5', item.tone].join(' ')}
                            >
                              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#173334]">
                                {item.label}: {item.value}
                              </Text>
                            </View>
                          ))}
                        </View>

                        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#647475]">
                          {insight.totalMembers} members
                        </Text>
                      </View>

                      <Text className="mt-2 text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#0B7A75]">
                        Total collected: {formatPeso(insight.totalCollected)}
                      </Text>

                      {period.status === 'closed' ? (
                        <Text className="mt-2 text-[11px] font-bold uppercase tracking-[1.1px] text-[#647475]">
                          Received by: {payoutForPeriod?.recipient_name ?? 'Member'}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        <View className="mt-6 gap-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/paluwagan/[id]/members', params: { id: paluwagan.id } })}
            className="min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">Members</Text>
          </TouchableOpacity>

          {paluwagan.organizer_id === user.id ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openPayouts}
              className="min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
            >
              <Text className="text-base font-extrabold text-white">Payouts</Text>
            </TouchableOpacity>
          ) : null}

          {paluwagan.organizer_id === user.id ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openCreatePeriod}
              className="min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
            >
              <Text className="text-base font-extrabold text-white">Create period</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/paluwagan/[id]/edit', params: { id: paluwagan.id } })}
            className="min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">Edit Paluwagan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleArchiveToggle}
            disabled={archiving}
            className="min-h-[52px] items-center justify-center rounded-2xl border border-[#D7E7E5] bg-white"
          >
            <Text
              className={[
                'text-base font-extrabold',
                paluwagan.status === 'archived' ? 'text-[#173334]' : 'text-[#C94B4B]',
              ].join(' ')}
            >
              {archiving
                ? paluwagan.status === 'archived'
                  ? 'Unarchiving...'
                  : 'Archiving...'
                : paluwagan.status === 'archived'
                  ? 'Unarchive Paluwagan'
                  : 'Archive Paluwagan'}
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
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F5F0',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F6F5F0',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
});
