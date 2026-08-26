import { useLocalSearchParams } from 'expo-router';
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

import { AddMemberForm } from '../../../components/members/add-member-form';
import { MemberRow } from '../../../components/members/member-row';
import { TopNav } from '../../../components/ui/top-nav';
import { getFriendlyErrorMessage, reportError } from '../../../lib/errors';
import {
  deletePaluwaganMember,
  listPaluwaganMembers,
  type PaluwaganMemberRecord,
  updatePaluwaganMember,
  updatePaluwaganMemberStatus,
} from '../../../services/members';
import { getPaluwaganById } from '../../../services/paluwagan';
import { useAuthStore } from '../../../stores/auth-store';

export default function PaluwaganMembersScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [paluwaganId, setPaluwaganId] = useState<string | null>(null);
  const [members, setMembers] = useState<PaluwaganMemberRecord[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<number | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [statusUpdatingMemberId, setStatusUpdatingMemberId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const item = await getPaluwaganById(id as string);
        setPaluwaganId(item?.id ?? null);

        if (item?.id) {
          const nextMembers = await listPaluwaganMembers(item.id);
          setMembers(nextMembers);
        }
      } catch (error: any) {
        reportError(error, { screen: 'members-load' });
        Alert.alert('Could not load members', getFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  function handleMemberAdded(member: PaluwaganMemberRecord) {
    setMembers((current) => [...current, member]);
  }

  function handleEditMember(member: PaluwaganMemberRecord) {
    if (member.role === 'organizer') {
      return;
    }

    setEditingMemberId(member.id);
    setEditName(member.display_name);
    setEditEmail(member.email);
    setEditPhone(member.phone ?? '');
    setEditStatus(member.status === 'inactive' ? 'inactive' : 'active');
  }

  async function handleSaveEdit() {
    if (!editingMemberId) return;

    try {
      setSavingEdit(true);
      const updated = await updatePaluwaganMember(editingMemberId, {
        display_name: editName,
        email: editEmail,
        phone: editPhone || null,
        status: editStatus,
      });

      setMembers((current) => current.map((member) => (member.id === updated.id ? updated : member)));
      setEditingMemberId(null);
      setEditName('');
      setEditEmail('');
      setEditPhone('');
      setEditStatus('active');
    } catch (error: any) {
      reportError(error, { screen: 'members-save-edit' });
      Alert.alert('Could not update member', getFriendlyErrorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  }

  function handleCancelEdit() {
    setEditingMemberId(null);
    setEditName('');
    setEditEmail('');
    setEditPhone('');
    setEditStatus('active');
  }

  async function handleSetInactive(member: PaluwaganMemberRecord, nextStatus: 'active' | 'inactive') {
    if (!user) {
      Alert.alert('Please sign in', 'You need to be signed in to change member status.');
      return;
    }

    setStatusUpdatingMemberId(member.id);

    try {
      const updated = await updatePaluwaganMemberStatus(member.id, nextStatus, user.id);
      setMembers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error: any) {
      reportError(error, { screen: 'members-set-status' });
      Alert.alert('Could not update member', getFriendlyErrorMessage(error));
    } finally {
      setStatusUpdatingMemberId((current) => (current === member.id ? null : current));
    }
  }

  function handleRemoveMember(member: PaluwaganMemberRecord) {
    Alert.alert('Remove member', `Remove ${member.display_name} from this Paluwagan?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePaluwaganMember(member.id);
            setMembers((current) => current.filter((item) => item.id !== member.id));
          } catch (error: any) {
            reportError(error, { screen: 'members-remove' });
            Alert.alert('Could not remove member', getFriendlyErrorMessage(error));
          }
        },
      },
    ]);
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
        <TopNav />

        <Text className="text-[30px] font-black text-[#173334]">Members</Text>
        <Text className="mt-2 text-base leading-6 text-[#647475]">
          Add members directly to the group and manage their contribution records.
        </Text>

        <AddMemberForm
          paluwaganId={paluwaganId}
          userId={user.id}
          onMemberAdded={handleMemberAdded}
        />

        {editingMemberId ? (
          <View className="mt-6 rounded-[22px] bg-white p-4">
            <Text className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
              Edit member
            </Text>

            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Member name"
              placeholderTextColor="#7B8E8F"
              className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
            />

            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="member@email.com"
              placeholderTextColor="#7B8E8F"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mt-3 min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
            />

            <TextInput
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Phone number (optional)"
              placeholderTextColor="#7B8E8F"
              keyboardType="phone-pad"
              className="mt-3 min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
            />

            <View className="mt-4">
              <Text className="mb-2 text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
                Member status
              </Text>

              <View className="flex-row gap-2">
                {(['active', 'inactive'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    activeOpacity={0.8}
                    onPress={() => setEditStatus(status)}
                    className={[
                      'flex-1 min-h-[44px] items-center justify-center rounded-2xl border',
                      editStatus === status ? 'border-[#0B7A75] bg-[#E8F4F2]' : 'border-[#D7E7E5] bg-white',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-sm font-extrabold uppercase',
                        editStatus === status ? 'text-[#0B7A75]' : 'text-[#173334]',
                      ].join(' ')}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mt-4 flex-row gap-2.5">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCancelEdit}
                className="min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-[#EEF4F3]"
              >
                <Text className="text-base font-extrabold text-[#173334]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSaveEdit}
                disabled={savingEdit || !editName.trim() || !editEmail.trim()}
                className={[
                  'min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-[#0B7A75]',
                  savingEdit || !editName.trim() || !editEmail.trim() ? 'opacity-50' : 'opacity-100',
                ].join(' ')}
              >
                <Text className="text-base font-extrabold text-white">
                  {savingEdit ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <Text className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
            Member list
          </Text>

          <Text className="mb-3 text-xs font-bold uppercase tracking-[1.2px] text-[#647475]">
            Swipe right to edit or remove. Swipe left to set active or inactive.
          </Text>

          {members.length === 0 ? (
            <View className="rounded-[22px] border border-dashed border-[#C9D8D5] bg-white p-5">
              <Text className="text-base font-extrabold text-[#173334]">No members yet</Text>
              <Text className="mt-1 text-sm text-[#647475]">
                Add the first member to start tracking contributions.
              </Text>
            </View>
          ) : (
            members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isEditing={editingMemberId === member.id}
                isActive={activeMemberId === member.id}
                isStatusUpdating={statusUpdatingMemberId === member.id}
                onActiveChange={(isActive) => {
                  setActiveMemberId((current) => (isActive ? member.id : current === member.id ? null : current));
                }}
                onEdit={handleEditMember}
                onSetInactive={handleSetInactive}
                onRemove={handleRemoveMember}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
  },
  memberListArea: {
    position: 'relative',
    marginTop: 24,
  },});
