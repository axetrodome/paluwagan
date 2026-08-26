import { useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { ContributionPeriodRecord } from '../../services/contributions';
import { formatPeso } from '../../services/paluwagan';

type PeriodInsight = {
  totalMembers: number;
  paid: number;
  partial: number;
  unpaid: number;
  totalCollected: number;
};

type PeriodRowProps = {
  period: ContributionPeriodRecord;
  isActive?: boolean;
  isSelected?: boolean;
  onPress: (period: ContributionPeriodRecord) => void;
  onEdit: (period: ContributionPeriodRecord) => void;
  onDelete: (period: ContributionPeriodRecord) => void;
  onSwipeOpen: (period: ContributionPeriodRecord) => void;
  onSwipeClose: (period: ContributionPeriodRecord) => void;
  setSwipeableRef?: (periodId: number, ref: Swipeable | null) => void;
  insight?: PeriodInsight;
};

export function PeriodRow({
  period,
  isActive = false,
  isSelected = false,
  onPress,
  onEdit,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
  setSwipeableRef,
  insight,
}: PeriodRowProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const statusColor =
    period.status === 'open'
      ? 'text-[#0B7A75]'
      : period.status === 'closed'
        ? 'text-[#C94B4B]'
        : 'text-[#B7791F]';

  const renderRightActions = () => (
    <View
      className={[
        'mb-3 flex-row overflow-hidden border border-[#D7E7E5] border-l-0 bg-white',
        isActive ? 'rounded-[22px] rounded-l-none' : 'rounded-[22px]',
      ].join(' ')}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onEdit(period)}
        className="min-w-[88px] items-center justify-center bg-[#0B7A75] px-3 py-[18px]"
      >
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-white">Edit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onDelete(period)}
        className="min-w-[88px] items-center justify-center bg-[#C94B4B] px-3 py-[18px]"
      >
        <Text className="text-[12px] font-extrabold uppercase tracking-[0.8px] text-white">Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={(ref) => {
        swipeableRef.current = ref;
        setSwipeableRef?.(period.id, ref);
      }}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => {
        onSwipeOpen(period);
      }}
      onSwipeableWillClose={() => {
        onSwipeClose(period);
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(period)}
        className={[
          'mb-3 overflow-hidden border bg-white p-3',
          isSelected ? 'border-[#0B7A75] bg-[#F0F8F7]' : 'border-[#D7E7E5]',
          isActive ? 'rounded-r-none rounded-[22px]' : 'rounded-[22px]',
        ].join(' ')}
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

        {insight ? (
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

            <Text className="text-[11px] font-extrabold uppercase tracking-[1.1px] text-[#0B7A75]">
              Total collected: {formatPeso(insight.totalCollected)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Swipeable>
  );
}
