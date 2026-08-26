import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { PaluwaganMemberRecord } from '../../services/members';

type MemberRowProps = {
  member: PaluwaganMemberRecord;
  isEditing?: boolean;
  isActive?: boolean;
  isStatusUpdating?: boolean;
  onActiveChange?: (isActive: boolean) => void;
  onEdit: (member: PaluwaganMemberRecord) => void;
  onSetInactive: (member: PaluwaganMemberRecord, nextStatus: 'active' | 'inactive') => void;
  onRemove: (member: PaluwaganMemberRecord) => void;
};

export function MemberRow({
  member,
  isEditing = false,
  isActive = false,
  isStatusUpdating = false,
  onActiveChange,
  onEdit,
  onSetInactive,
  onRemove,
}: MemberRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const pressStartedRef = useRef(false);
  const isOrganizer = member.role === 'organizer';

  useEffect(() => {
    if ((isEditing || isOrganizer) && swipeableRef.current) {
      swipeableRef.current.close();
      onActiveChange?.(false);
      return;
    }

    if (!isActive && swipeableRef.current) {
      swipeableRef.current.close();
    }
  }, [isActive, isEditing, isOrganizer, onActiveChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isEditing && !isOrganizer,
      onMoveShouldSetPanResponder: (_, gestureState) => !isEditing && !isOrganizer && Math.abs(gestureState.dx) > 8,
      onPanResponderGrant: () => {
        if (isEditing || isOrganizer) return;
        pressStartedRef.current = true;
      },
      onPanResponderTerminate: () => {
        pressStartedRef.current = false;
      },
      onPanResponderRelease: () => {
        pressStartedRef.current = false;
      },
    }),
  ).current;

  const rowIsActive = isActive || pressStartedRef.current;

  const confirmStatusChange = (nextStatus: 'active' | 'inactive') => {
    const actionLabel = nextStatus === 'active' ? 'Activate' : 'Set inactive';
    const heading = nextStatus === 'inactive' ? 'Set member inactive' : 'Set member active';
    const message =
      nextStatus === 'inactive'
        ? `This will mark ${member.display_name} as inactive in this Paluwagan. Continue?`
        : `This will make ${member.display_name} active again in this Paluwagan. Continue?`;
    const confirmLabel = nextStatus === 'inactive' ? 'Yes, set inactive' : 'Yes, make active';

    swipeableRef.current?.close();
    onActiveChange?.(false);

    Alert.alert(heading, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmLabel,
        style: 'destructive',
        onPress: () => {
          onSetInactive(member, nextStatus);
        },
      },
    ]);
  };

  const renderLeftActions = () => (
    <View className="mb-3" style={{ width: 8, opacity: 0 }} />
  );

  const renderRightActions = () => (
    <View
      className={[
        'mb-3 flex-row overflow-hidden border border-[#D7E7E5] border-l-0 bg-white',
        rowIsActive ? 'rounded-[22px] rounded-l-none' : 'rounded-[22px]',
      ].join(' ')}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onEdit(member)}
        className="min-w-[88px] items-center justify-center px-3 py-[18px] bg-[#0B7A75]"
      >
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-white">Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onRemove(member)}
        className="min-w-[88px] items-center justify-center px-3 py-[18px] bg-[#C94B4B]"
      >
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-white">Remove</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={isEditing || isOrganizer ? () => null : renderLeftActions}
      renderRightActions={isEditing || isOrganizer ? () => null : renderRightActions}
      onSwipeableWillOpen={(direction) => {
        onActiveChange?.(true);

        if (direction === 'left') {
          const nextStatus = member.status === 'inactive' ? 'active' : 'inactive';
          confirmStatusChange(nextStatus);
        }
      }}
    >
      <View
        {...panResponder.panHandlers}
        className={[
          'mb-3 overflow-hidden border px-4 py-[14px]',
          isOrganizer ? 'border-[#D7E7E5] bg-[#F2F5F4] opacity-80' : 'border-[#D7E7E5] bg-white',
          rowIsActive ? 'rounded-r-none rounded-[22px]' : 'rounded-[22px]',
        ].join(' ')}
      >
        <View className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text className={['text-base font-extrabold', isOrganizer ? 'text-[#0B7A75]' : 'text-[#173334]'].join(' ')}>
              {member.display_name}
            </Text>
            <Text className={['mt-1 text-xs', isOrganizer ? 'text-[#2A8A84]' : 'text-[#647475]'].join(' ')}>
              {member.email}
            </Text>
            <Text className={['mt-1 text-[10px] font-bold uppercase tracking-[1px]', isOrganizer ? 'text-[#0B7A75]' : 'text-[#647475]'].join(' ')}>
              {member.role}
            </Text>
          </View>

          {!isEditing && !isOrganizer ? (
            <View
              className={[
                'rounded-full px-2.5 py-1.5',
                isStatusUpdating
                  ? 'bg-[#EEF4F3]'
                  : member.status === 'inactive'
                    ? 'bg-[#FDECEC]'
                    : 'bg-[#E8F4F2]',
              ].join(' ')}
            >
              {isStatusUpdating ? (
                <View className="h-4 w-4 items-center justify-center">
                  <ActivityIndicator size="small" color="#0B7A75" />
                </View>
              ) : (
                <Text
                  className={[
                    'text-[10px] font-black uppercase',
                    member.status === 'inactive' ? 'text-[#C94B4B]' : 'text-[#0B7A75]',
                  ].join(' ')}
                >
                  {member.status}
                </Text>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
}
