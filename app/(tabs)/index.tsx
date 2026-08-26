import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { formatPeso, listPaluwagansForUser, type PaluwaganRecord } from '../../services/paluwagan';
import { listPayoutsForPaluwagan } from '../../services/payouts';
import { reportError } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth-store';

type DashboardSummary = {
  totalGroups: number;
  totalContribution: number;
  nextPayout: {
    paluwaganName: string;
    recipientName: string;
    amount: number;
    scheduledFor: string;
  } | null;
  recentGroups: PaluwaganRecord[];
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-[18px] bg-white p-3">
      <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">{label}</Text>
      <Text className="mt-2 text-lg font-extrabold text-[#173334]">{value}</Text>
    </View>
  );
}

export default function HomeTab() {
  const { session, isReady } = useAuthStore();
  const user = session?.user;
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary>({
    totalGroups: 0,
    totalContribution: 0,
    nextPayout: null,
    recentGroups: [],
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const currentUser = user;
    let active = true;

    async function loadDashboard() {
      setLoading(true);

      try {
        const paluwagans = await listPaluwagansForUser(currentUser.id, undefined, currentUser.email ?? undefined);

        const scheduledPayouts = (
          await Promise.all(
            paluwagans.map(async (paluwagan) => {
              const payouts = await listPayoutsForPaluwagan(paluwagan.id);
              return payouts
                .filter((payout) => payout.status === 'scheduled')
                .map((payout) => ({
                  paluwaganName: paluwagan.name,
                  recipientName: payout.recipient_name ?? 'Member',
                  amount: Number(payout.amount ?? 0),
                  scheduledFor: payout.scheduled_for,
                }));
            }),
          )
        ).flat();

        scheduledPayouts.sort(
          (left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime(),
        );

        const nextPayout = scheduledPayouts[0] ?? null;

        if (active) {
          setSummary({
            totalGroups: paluwagans.length,
            totalContribution: paluwagans.reduce((total, paluwagan) => total + Number(paluwagan.contribution_amount ?? 0), 0),
            nextPayout,
            recentGroups: paluwagans.slice(0, 3),
          });
        }
      } catch (error) {
        reportError(error, { screen: 'home-dashboard' });
        if (active) {
          setSummary({
            totalGroups: 0,
            totalContribution: 0,
            nextPayout: null,
            recentGroups: [],
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [user]);

  if (!isReady || !session || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F6F5F0]">
        <ActivityIndicator size="large" color="#0B7A75" />
      </View>
    );
  }

  const authenticatedUser = user;

  const greetingName =
    authenticatedUser.user_metadata?.full_name ??
    authenticatedUser.user_metadata?.name ??
    authenticatedUser.user_metadata?.display_name ??
    authenticatedUser.email?.split('@')[0] ??
    'there';

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <View className="mb-5 flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.3px] text-[#0B7A75]">Dashboard</Text>
            <Text className="mt-2 text-[28px] font-extrabold leading-[36px] text-[#173334]">
              Hi, {greetingName}
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-[#0B7A75]">
            <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>₱</Text>
          </View>
        </View>

        {loading ? (
          <View className="mt-6 items-center justify-center py-10">
            <ActivityIndicator size="large" color="#0B7A75" />
          </View>
        ) : (
          <>
            <View className="rounded-[22px] bg-[#E8F4F2] p-4">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                At a glance
              </Text>

              <View className="mt-4 flex-row gap-3">
                <StatCard label="Groups" value={String(summary.totalGroups)} />
                <StatCard label="Contribution" value={formatPeso(summary.totalContribution)} />
              </View>
            </View>

            <View className="mt-5 rounded-[22px] border border-[#D7E7E5] bg-white p-4">
              <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">Next payout</Text>

              {summary.nextPayout ? (
                <>
                  <Text className="mt-2 text-lg font-extrabold text-[#173334]">{summary.nextPayout.paluwaganName}</Text>
                  <Text className="mt-1 text-sm text-[#647475]">Recipient: {summary.nextPayout.recipientName}</Text>
                  <Text className="mt-2 text-xl font-extrabold text-[#173334]">
                    {formatPeso(summary.nextPayout.amount)}
                  </Text>
                  <Text className="mt-1 text-sm text-[#647475]">
                    {new Date(`${summary.nextPayout.scheduledFor}T12:00:00`).toLocaleDateString('en-PH', {
                      dateStyle: 'long',
                    })}
                  </Text>
                </>
              ) : (
                <Text className="mt-2 text-base font-semibold text-[#647475]">No upcoming payout scheduled.</Text>
              )}
            </View>

            <View className="mt-5 rounded-[22px] bg-white p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                  Recent groups
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(tabs)/paluwagans')}
                  className="rounded-xl bg-[#E8F4F2] px-2.5 py-1.5"
                >
                  <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#0B7A75]">
                    View all
                  </Text>
                </TouchableOpacity>
              </View>

              {summary.recentGroups.length === 0 ? (
                <View className="rounded-[18px] border border-dashed border-[#C9D8D5] bg-[#F8F9F7] p-4">
                  <Text className="text-base font-extrabold text-[#173334]">No Paluwagans yet</Text>
                  <Text className="mt-1 text-sm text-[#647475]">
                    Create your first group to start tracking contributions and payouts.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {summary.recentGroups.map((paluwagan) => (
                    <TouchableOpacity
                      key={paluwagan.id}
                      activeOpacity={0.8}
                      onPress={() => router.push({ pathname: '/paluwagan/[id]', params: { id: paluwagan.id } })}
                      className="rounded-[18px] border border-[#D7E7E5] bg-[#F8F9F7] p-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-extrabold text-[#173334]">{paluwagan.name}</Text>
                        <Text className="text-[10px] font-extrabold uppercase tracking-[1px] text-[#0B7A75]">
                          {paluwagan.status}
                        </Text>
                      </View>

                      <Text className="mt-1 text-sm text-[#647475]">
                        {formatPeso(paluwagan.contribution_amount)} · {paluwagan.frequency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View className="mt-6 gap-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/paluwagan/create')}
            className="min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
          >
            <Text className="text-base font-extrabold text-white">Create Paluwagan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/paluwagans')}
            className="min-h-[52px] items-center justify-center rounded-2xl border border-[#D7E7E5] bg-white"
          >
            <Text className="text-base font-extrabold text-[#173334]">View my Paluwagans</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
