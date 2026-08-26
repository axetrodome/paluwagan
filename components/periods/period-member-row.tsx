import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { ContributionRecord } from '../../services/contributions';

type PeriodMemberRowProps = {
  member: ContributionRecord;
  amountValue: string;
  noteValue: string;
  savingMemberId: number | null;
  savedMemberId: number | null;
  uploadingProofMemberId?: number | null;
  proofUrl?: string | null;
  isReadOnly?: boolean;
  onAmountChange: (memberId: number, value: string) => void;
  onNoteChange: (memberId: number, value: string) => void;
  onSave: (member: ContributionRecord, amountText: string, noteText: string) => void;
  onPreset: (memberId: number, presetValue: number, currentNote: string) => void;
  onUploadProof?: (member: ContributionRecord) => void;
};

export function PeriodMemberRow({
  member,
  amountValue,
  noteValue,
  savingMemberId,
  savedMemberId,
  uploadingProofMemberId,
  proofUrl,
  isReadOnly = false,
  onAmountChange,
  onNoteChange,
  onSave,
  onPreset,
  onUploadProof,
}: PeriodMemberRowProps) {
  const amountKey = String(member.id);
  const isPaid = member.amount_paid >= member.amount_due;
  const statusTone =
    member.status === 'paid' || isPaid
      ? 'bg-[#E8F4F2] text-[#0B7A75]'
      : member.status === 'partial' || member.status === 'submitted'
        ? 'bg-[#FFF4D8] text-[#B7791F]'
        : member.status === 'overdue'
          ? 'bg-[#FDECEC] text-[#C94B4B]'
          : 'bg-[#EEF4F3] text-[#647475]';

  return (
    <View className="overflow-hidden rounded-[26px] border border-[#D7E7E5] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-extrabold text-[#173334]">{member.member_name}</Text>
          <Text className="mt-1 text-xs text-[#647475]">{member.member_email}</Text>
        </View>

        <View className={['rounded-full px-2.5 py-1.5', statusTone].join(' ')}>
          <Text className="text-[10px] font-black uppercase">{member.status}</Text>
        </View>
      </View>

      <View className="mt-4 gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-[#647475]">Due</Text>
          <Text className="text-sm font-bold text-[#173334]">₱{(member.amount_due / 100).toFixed(2)}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-[#647475]">Paid</Text>
          <Text className="text-sm font-bold text-[#173334]">₱{(member.amount_paid / 100).toFixed(2)}</Text>
        </View>

        {member.paid_at ? (
          <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#647475]">
            Paid on {new Date(member.paid_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} at{' '}
            {new Date(member.paid_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        ) : null}

        {member.proof_path || proofUrl ? (
          <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#0B7A75]">Proof attached</Text>
        ) : null}

        {proofUrl ? (
          <View className="mt-3 overflow-hidden rounded-[18px] border border-[#D7E7E5] bg-[#F8F9F7]">
            <Image source={{ uri: proofUrl }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
          </View>
        ) : null}

        {member.verified_at ? (
          <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#0B7A75]">Verified</Text>
        ) : null}
      </View>

      <View className="mt-4 rounded-[22px] border border-[#D7E7E5] bg-[#F8F9F7] p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[10px] font-extrabold uppercase tracking-[1.2px] text-[#647475]">Record contribution</Text>
          {isReadOnly ? (
            <View className="rounded-full bg-[#EEF4F3] px-2 py-1">
              <Text className="text-[9px] font-black uppercase text-[#647475]">Read only</Text>
            </View>
          ) : savedMemberId === member.id ? (
            <View className="rounded-full bg-[#E8F4F2] px-2 py-1">
              <Text className="text-[9px] font-black uppercase text-[#0B7A75]">Saved</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-1 flex-row gap-2">
          <TextInput
            value={amountValue}
            onChangeText={(text) => {
              if (!isReadOnly) {
                onAmountChange(member.id, text);
              }
            }}
            editable={!isReadOnly}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#7B8E8F"
            className={[
              'min-h-[52px] flex-1 rounded-2xl border border-[#D7E7E5] bg-white px-3 py-2 text-base text-[#173334]',
              isReadOnly ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isReadOnly || savingMemberId === member.id}
            onPress={() => {
              if (!isReadOnly) {
                onSave(member, amountValue, noteValue);
              }
            }}
            className={[
              'min-h-[52px] items-center justify-center rounded-2xl bg-[#0B7A75] px-4',
              isReadOnly || savingMemberId === member.id ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
          >
            {savingMemberId === member.id ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-sm font-extrabold text-white">Saving...</Text>
              </View>
            ) : (
              <Text className="text-sm font-extrabold text-white">{isReadOnly ? 'Locked' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row gap-2">
          {[
            { label: 'Full', value: member.amount_due },
            { label: 'Half', value: Math.round(member.amount_due / 2) },
            { label: 'Zero', value: 0 },
          ].map((preset) => (
            <TouchableOpacity
              key={preset.label}
              activeOpacity={0.8}
              disabled={isReadOnly}
              onPress={() => {
                if (!isReadOnly) {
                  onPreset(member.id, Number(preset.value), noteValue);
                }
              }}
              className={[
                'flex-1 rounded-xl border border-[#D7E7E5] bg-white px-2 py-3',
                isReadOnly ? 'opacity-60' : 'opacity-100',
              ].join(' ')}
            >
              <Text className="text-center text-[10px] font-black uppercase text-[#173334]">{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isReadOnly || uploadingProofMemberId === member.id}
          onPress={() => {
            if (!isReadOnly) {
              onUploadProof?.(member);
            }
          }}
          className={[
            'mt-3 min-h-[46px] items-center justify-center rounded-2xl border px-3',
            proofUrl ? 'border-[#CFE8E2] bg-[#E8F4F2]' : 'border-[#D7E7E5] bg-white',
            isReadOnly ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
        >
          {uploadingProofMemberId === member.id ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#0B7A75" />
              <Text className="text-sm font-extrabold text-[#0B7A75]">Uploading...</Text>
            </View>
          ) : (
            <Text className="text-sm font-extrabold text-[#173334]">
              {isReadOnly ? 'Read only' : proofUrl ? 'Replace proof' : 'Upload proof'}
            </Text>
          )}
        </TouchableOpacity>

        <TextInput
          value={noteValue}
          onChangeText={(text) => {
            if (!isReadOnly) {
              onNoteChange(member.id, text);
            }
          }}
          editable={!isReadOnly}
          placeholder="Add a note or payment detail"
          placeholderTextColor="#7B8E8F"
          multiline
          numberOfLines={2}
          className={[
            'mt-3 min-h-[62px] rounded-2xl border border-[#D7E7E5] bg-white px-3 py-2 text-sm text-[#173334]',
            isReadOnly ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
        />
      </View>
    </View>
  );
}
