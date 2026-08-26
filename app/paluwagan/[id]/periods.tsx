import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { PeriodRow } from '../../../components/periods/period-row';
import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import {
  deleteContributionPeriod,
  listContributionPeriodMembers,
  listContributionPeriods,
  type ContributionPeriodRecord,
} from '../../../services/contributions';
import { useAuthStore } from '../../../stores/auth-store';

type PeriodInsight = {
  totalMembers: number;
  paid: number;
  partial: number;
  unpaid: number;
  totalCollected: number;
};

export default function ContributionPeriodsListScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<ContributionPeriodRecord[]>([]);
  const [periodInsights, setPeriodInsights] = useState<Record<number, PeriodInsight>>({});
  const [activePeriodId, setActivePeriodId] = useState<number | null>(null);
  const periodSwipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const overallStatusCounts = periods.reduce(
    (acc, period) => {
      if (period.status === 'open') acc.open += 1;
      if (period.status === 'draft') acc.draft += 1;
      if (period.status === 'closed') acc.closed += 1;
      return acc;
    },
    { open: 0, draft: 0, closed: 0 },
  );

  const overallCollected = periods.reduce((sum, period) => sum + (periodInsights[period.id]?.totalCollected ?? 0), 0);
  const overallStatusSummary = periods.reduce(
    (acc, period) => {
      const insight = periodInsights[period.id] ?? { totalMembers: 0, paid: 0, partial: 0, unpaid: 0, totalCollected: 0 };
      acc.paid += insight.paid;
      acc.partial += insight.partial;
      acc.unpaid += insight.unpaid;
      return acc;
    },
    { paid: 0, partial: 0, unpaid: 0 },
  );
  const paidPeriods = periods.filter((period) => (periodInsights[period.id]?.paid ?? 0) > 0).length;

  const paluwaganId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined;

  const openCreatePeriod = () => {
    if (!paluwaganId) {
      Alert.alert('Missing paluwagan', 'This period list is missing the Paluwagan ID.');
      return;
    }

    router.push({ pathname: '/paluwagan/[id]/period-create', params: { id: paluwaganId } });
  };

  const loadPeriods = useCallback(async () => {
    if (!paluwaganId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextPeriods = await listContributionPeriods(paluwaganId);
      const nextInsights = await Promise.all(
        nextPeriods.map(async (period) => {
          const members = await listContributionPeriodMembers(paluwaganId, period.id);

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
      setPeriodInsights(Object.fromEntries(nextInsights));
    } catch (error: any) {
      reportError(error, { screen: 'periods-load' });
      Alert.alert('Could not load periods', getFriendlyErrorMessage(error));
      setPeriods([]);
      setPeriodInsights({});
    } finally {
      setLoading(false);
    }
  }, [paluwaganId]);

  const handlePeriodPress = useCallback((period: ContributionPeriodRecord) => {
    if (!paluwaganId) {
      return;
    }

    router.push({
      pathname: '/paluwagan/[id]/period-detail',
      params: { id: paluwaganId, periodId: String(period.id) },
    });
  }, [paluwaganId]);

  const handleEditPeriod = (period: ContributionPeriodRecord) => {
    if (!paluwaganId) {
      return;
    }

    router.push({
      pathname: '/paluwagan/[id]/period-create',
      params: { id: paluwaganId, periodId: String(period.id), mode: 'edit' },
    });
  };

  const handleDeletePeriod = (period: ContributionPeriodRecord) => {
    if (!paluwaganId || !user) {
      return;
    }

    Alert.alert(
      'Delete period',
      `Delete Period ${period.period_number}? This will also remove its contribution records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContributionPeriod(paluwaganId, user.id, period.id);
              setActivePeriodId(null);
              await loadPeriods();
            } catch (error: any) {
              reportError(error, { screen: 'periods-delete' });
              Alert.alert('Could not delete period', getFriendlyErrorMessage(error));
            }
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      void loadPeriods();
    }, [loadPeriods]),
  );

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

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} stickyHeaderIndices={[0]}>
        <TopNav />

        <View className="mb-5">
          <Text className="text-[30px] font-black text-[#173334]">Contribution periods</Text>

          <View className="mt-4 gap-3 rounded-[22px] border border-[#D7E7E5] bg-white p-4">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">Overview</Text>

            <View className="flex-row gap-2">
              {[
                { label: 'Total', value: periods.length, tone: 'bg-[#E8F4F2] border-[#CFE8E2]' },
                { label: 'Open', value: overallStatusCounts.open, tone: 'bg-[#E8F4F2] border-[#CFE8E2]' },
                { label: 'Draft', value: overallStatusCounts.draft, tone: 'bg-[#FFF4D8] border-[#F3E4B1]' },
                { label: 'Closed', value: overallStatusCounts.closed, tone: 'bg-[#EEF4F3] border-[#D7E7E5]' },
              ].map((item) => (
                <View key={item.label} className={['flex-1 rounded-[16px] border p-3', item.tone].join(' ')}>
                  <Text className="text-[9px] font-black uppercase tracking-[1.1px] text-[#647475]">{item.label}</Text>
                  <Text className="mt-1 text-xl font-extrabold text-[#173334]">{item.value}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'Paid', value: overallStatusSummary.paid, tone: 'bg-[#E8F4F2] border-[#CFE8E2]' },
                { label: 'Partial', value: overallStatusSummary.partial, tone: 'bg-[#FFF4D8] border-[#F3E4B1]' },
                { label: 'Unpaid', value: overallStatusSummary.unpaid, tone: 'bg-[#EEF4F3] border-[#D7E7E5]' },
              ].map((item) => (
                <View key={item.label} className={['rounded-full border px-2.5 py-1.5', item.tone].join(' ')}>
                  <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#173334]">
                    {item.label}: {item.value}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#647475]">
                Collected: {overallCollected > 0 ? `₱${(overallCollected / 100).toFixed(2)}` : '₱0.00'}
              </Text>
              <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#647475]">
                Active cycles: {paidPeriods}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openCreatePeriod}
            className="mt-3 min-h-[42px] items-center justify-center rounded-xl bg-[#0B7A75] px-3"
          >
            <Text className="text-sm font-extrabold text-white">Create period</Text>
          </TouchableOpacity>
        </View>

        {periods.length === 0 ? (
          <View className="rounded-[22px] border border-dashed border-[#C9D8D5] bg-white p-5">
            <Text className="text-base font-extrabold text-[#173334]">No periods yet</Text>
            <Text className="mt-1 text-sm text-[#647475]">Create your first contribution cycle for this Paluwagan.</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openCreatePeriod}
              className="mt-4 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
            >
              <Text className="text-base font-extrabold text-white">Create period</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3">
            {periods.map((period) => {
              const insight = periodInsights[period.id] ?? {
                totalMembers: 0,
                paid: 0,
                partial: 0,
                unpaid: 0,
                totalCollected: 0,
              };

              return (
                <PeriodRow
                  key={String(period.id)}
                  period={period}
                  insight={insight}
                  isActive={activePeriodId === period.id}
                  isSelected={false}
                  onPress={handlePeriodPress}
                  onEdit={handleEditPeriod}
                  onDelete={handleDeletePeriod}
                  setSwipeableRef={(periodId, ref) => {
                    periodSwipeableRefs.current[String(periodId)] = ref;
                  }}
                  onSwipeOpen={(nextPeriod) => {
                    setActivePeriodId(nextPeriod.id);

                    Object.entries(periodSwipeableRefs.current).forEach(([key, ref]) => {
                      if (key !== String(nextPeriod.id)) {
                        ref?.close();
                      }
                    });
                  }}
                  onSwipeClose={(nextPeriod) => {
                    setActivePeriodId((current) => (current === nextPeriod.id ? null : current));
                  }}
                />
              );
            })}
          </View>
        )}
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
