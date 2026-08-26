import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { formatPeso, listPaluwagansForUser, type PaluwaganRecord } from '../../services/paluwagan';
import { reportError } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth-store';

export default function PaluwagansTab() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<PaluwaganRecord[]>([]);
  const [archivedItems, setArchivedItems] = useState<PaluwaganRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const resetToActiveView = useCallback(() => {
    setShowArchived(false);
  }, []);

  const loadPaluwagans = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [nextItems, nextArchivedItems] = await Promise.all([
        listPaluwagansForUser(user.id, undefined, user.email ?? undefined),
        listPaluwagansForUser(user.id, 'archived', user.email ?? undefined),
      ]);

      setItems(nextItems);
      setArchivedItems(nextArchivedItems);
    } catch (error) {
      reportError(error, { screen: 'paluwagans-list' });
      setItems([]);
      setArchivedItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setShowArchived(false);
      void loadPaluwagans();
    }, [loadPaluwagans]),
  );

  if (!user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F6F5F0]" style={styles.loadingSafeArea}>
        <ActivityIndicator size="large" color="#0B7A75" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F6F5F0]" style={styles.safeArea}>
      <View className="flex-1 px-5 py-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-[30px] font-black text-[#173334]">Paluwagans</Text>

          <Pressable
            onPress={() => router.push('/paluwagan/create')}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="rounded-xl bg-[#0B7A75] px-3.5 py-2.5"
          >
            <Text className="text-sm font-extrabold text-white">+ New</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0B7A75" />
          </View>
        ) : (items.length === 0 && archivedItems.length === 0) ? (
          <View className="flex-1 items-center justify-center">
            <View className="w-full max-w-[360px] rounded-[28px] border border-dashed border-[#C9D8D5] bg-white p-6">
              <View className="h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[#E8F4F2]">
                <Text className="text-[28px] font-black text-[#0B7A75]">₱</Text>
              </View>

              <View className="mt-3">
                <Text className="text-[24px] font-black text-[#173334]">No Paluwagans yet</Text>
                <Text className="mt-1.5 text-base leading-6 text-[#647475]">
                  Create your first group to start tracking contributions, payouts, and payment history.
                </Text>
              </View>

              <Pressable
                onPress={() => router.push('/paluwagan/create')}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="mt-2 w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
              >
                <Text className="text-base font-extrabold text-white">Create Paluwagan</Text>
              </Pressable>
            </View>
          </View>
        ) : items.length === 0 ? (
          showArchived ? (
            <View>
              <Pressable
                onPress={resetToActiveView}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="mb-3 min-h-[44px] items-center justify-center rounded-xl border border-[#D7E7E5] bg-white"
              >
                <Text className="text-sm font-extrabold text-[#173334]">Back to active paluwagans</Text>
              </Pressable>

              <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                {archivedItems.map((item, index) => (
                  <View key={item.id} className={index === archivedItems.length - 1 ? '' : 'mb-3'}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/paluwagan/[id]', params: { id: item.id } })}
                      className="rounded-[22px] border border-[#D7E7E5] bg-white p-4"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="mr-3 flex-1">
                          <Text className="text-[18px] font-black text-[#173334]">{item.name}</Text>
                          <Text className="mt-1 text-[13px] font-semibold capitalize text-[#647475]">{item.frequency}</Text>
                        </View>

                        <View className="rounded-full bg-[#E8F4F2] px-2 py-1.5">
                          <Text className="text-[11px] font-black uppercase text-[#0B7A75]">{item.status}</Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Contribution</Text>
                        <Text className="text-base font-black text-[#173334]">{formatPeso(item.contribution_amount)}</Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Start date</Text>
                        <Text className="text-sm font-bold text-[#173334]">
                          {new Date(item.start_date).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <View className="w-full max-w-[360px] rounded-[28px] border border-dashed border-[#C9D8D5] bg-white p-6">
                <View className="h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[#E8F4F2]">
                  <Text className="text-[28px] font-black text-[#0B7A75]">₱</Text>
                </View>

                <View className="mt-3">
                  <Text className="text-[24px] font-black text-[#173334]">No active paluwagans yet</Text>
                  <Text className="mt-1.5 text-base leading-6 text-[#647475]">
                    You have archived groups, but no active Paluwagans right now.
                  </Text>
                </View>

                <Pressable
                  onPress={() => setShowArchived(true)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="mt-2 w-full min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]"
                >
                  <Text className="text-base font-extrabold text-white">View archived</Text>
                </Pressable>
              </View>
            </View>
          )
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {items.length > 0 && (
              <View className="mb-4">
                <Text className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                  Active
                </Text>
                {items.map((item, index) => (
                  <View key={item.id} className={index === items.length - 1 ? '' : 'mb-3'}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/paluwagan/[id]', params: { id: item.id } })}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="rounded-[22px] bg-white p-4"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="mr-3 flex-1">
                          <Text className="text-[18px] font-black text-[#173334]">{item.name}</Text>
                          <Text className="mt-1 text-[13px] font-semibold capitalize text-[#647475]">{item.frequency}</Text>
                        </View>

                        <View
                          className={[
                            'rounded-full px-2 py-1.5',
                            item.status === 'archived' ? 'bg-[#E7E7E7]' : 'bg-[#E8F4F2]',
                          ].join(' ')}
                        >
                          <Text
                            className={[
                              'text-[11px] font-black uppercase',
                              item.status === 'archived' ? 'text-[#647475]' : 'text-[#0B7A75]',
                            ].join(' ')}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Contribution</Text>
                        <Text className="text-base font-black text-[#173334]">{formatPeso(item.contribution_amount)}</Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Start date</Text>
                        <Text className="text-sm font-bold text-[#173334]">
                          {new Date(item.start_date).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {archivedItems.length > 0 && (
              <View>
                <Pressable
                  onPress={() => setShowArchived((current) => !current)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="mb-2 flex-row items-center justify-between rounded-xl bg-[#F0F4F3] px-3 py-2.5"
                >
                  <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                    Archived
                  </Text>
                  <Text className="text-sm font-bold text-[#173334]">{showArchived ? 'Hide' : `Show (${archivedItems.length})`}</Text>
                </Pressable>

                {showArchived && archivedItems.map((item, index) => (
                  <View key={item.id} className={index === archivedItems.length - 1 ? '' : 'mb-3'}>
                    <Pressable
                      onPress={() => router.push({ pathname: '/paluwagan/[id]', params: { id: item.id } })}
                      className="rounded-[22px] border border-[#D7E7E5] bg-white p-4"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="mr-3 flex-1">
                          <Text className="text-[18px] font-black text-[#173334]">{item.name}</Text>
                          <Text className="mt-1 text-[13px] font-semibold capitalize text-[#647475]">{item.frequency}</Text>
                        </View>

                        <View className="rounded-full bg-[#E7E7E7] px-2 py-1.5">
                          <Text className="text-[11px] font-black uppercase text-[#647475]">{item.status}</Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Contribution</Text>
                        <Text className="text-base font-black text-[#173334]">{formatPeso(item.contribution_amount)}</Text>
                      </View>

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-[#647475]">Start date</Text>
                        <Text className="text-sm font-bold text-[#173334]">
                          {new Date(item.start_date).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F5F0',
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: '#F6F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
