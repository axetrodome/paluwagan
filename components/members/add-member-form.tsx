import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { getFriendlyErrorMessage, reportError } from '../../lib/errors';
import { createPaluwaganMember, type PaluwaganMemberRecord } from '../../services/members';

type AddMemberFormProps = {
  paluwaganId: string | null;
  userId: string;
  onMemberAdded: (member: PaluwaganMemberRecord) => void;
};

export function AddMemberForm({ paluwaganId, userId, onMemberAdded }: AddMemberFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreateMember() {
    if (!paluwaganId) {
      Alert.alert('Paluwagan not ready', 'Please wait for the group to finish loading.');
      return;
    }

    try {
      setCreating(true);
      const nextMember = await createPaluwaganMember(paluwaganId, userId, {
        display_name: name,
        email,
        phone: phone || null,
        role: 'member',
      });

      onMemberAdded(nextMember);
      setName('');
      setEmail('');
      setPhone('');
      Alert.alert('Member added', `${nextMember.display_name} is now part of this Paluwagan.`);
    } catch (error: any) {
      reportError(error, { screen: 'add-member-form' });
      Alert.alert('Could not create member', getFriendlyErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  const isSubmitDisabled = creating || !name.trim() || !email.trim();

  return (
    <View className="mt-6 rounded-[22px] bg-white p-4">
      <Text className="mb-3 text-[11px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">
        Add member
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Member name"
        placeholderTextColor="#7B8E8F"
        className="min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
      />

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="member@email.com"
        placeholderTextColor="#7B8E8F"
        keyboardType="email-address"
        autoCapitalize="none"
        className="mt-3 min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
      />

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number (optional)"
        placeholderTextColor="#7B8E8F"
        keyboardType="phone-pad"
        className="mt-3 min-h-[52px] rounded-2xl border border-[#D7E7E5] bg-[#F8F8F6] px-4 py-3 text-base text-[#173334]"
      />

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleCreateMember}
        disabled={isSubmitDisabled}
        className={[
          'mt-3 min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75]',
          isSubmitDisabled ? 'opacity-50' : 'opacity-100',
        ].join(' ')}
      >
        <Text className="text-base font-extrabold text-white">{creating ? 'Saving...' : 'Add member'}</Text>
      </TouchableOpacity>
    </View>
  );
}
