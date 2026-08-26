import { getSupabaseClient } from '../lib/supabase';
import { buildPayoutGenerationPlan, isPaidPayout } from './payouts-plan';
export type PayoutStatus = 'scheduled' | 'completed' | 'cancelled';

export type PayoutRecord = {
  id: number;
  paluwagan_id: number;
  recipient_member_id: number;
  recipient_name?: string | null;
  payout_position: number;
  scheduled_for: string;
  amount: number;
  status: PayoutStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

function normalizePayout(row: Record<string, any>, recipientName?: string | null): PayoutRecord {
  return {
    id: Number(row.id),
    paluwagan_id: Number(row.paluwagan_id),
    recipient_member_id: Number(row.recipient_member_id),
    recipient_name: recipientName ?? null,
    payout_position: Number(row.payout_position ?? 0),
    scheduled_for: row.scheduled_for ?? '',
    amount: Number(row.amount ?? 0),
    status: (row.status as PayoutStatus) ?? 'scheduled',
    completed_at: row.completed_at ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? null,
  };
}

async function fetchMemberDisplayNames(memberIds: number[]) {
  const uniqueIds = Array.from(new Set(memberIds.filter((value) => Number.isFinite(value) && value > 0)));

  if (uniqueIds.length === 0) {
    return new Map<number, string>();
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('paluwagan_members')
    .select('id, display_name')
    .in('id', uniqueIds);

  if (error) {
    throw error;
  }

  const memberMap = new Map<number, string>();
  for (const member of data ?? []) {
    memberMap.set(Number(member.id), member.display_name ?? 'Member');
  }

  return memberMap;
}

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function addDateDays(dateString: string, dayCount: number) {
  const date = new Date(`${dateString}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function addDateMonths(dateString: string, monthCount: number) {
  const baseDate = new Date(`${dateString}T12:00:00.000Z`);
  const targetMonth = baseDate.getUTCMonth() + monthCount;
  const targetYear = baseDate.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const dayOfMonth = Math.min(baseDate.getUTCDate(), lastDayOfTargetMonth);

  const nextDate = new Date(Date.UTC(targetYear, normalizedMonth, dayOfMonth, 12, 0, 0, 0));
  return nextDate.toISOString().slice(0, 10);
}

function getPayoutScheduledDate(dateString: string | null | undefined, frequency: string | null | undefined, payoutPosition: number) {
  const normalizedStartDate = dateString || new Date().toISOString().slice(0, 10);
  const normalizedFrequency = (frequency ?? 'monthly').toLowerCase();

  if (normalizedFrequency === 'weekly') {
    return addDateDays(normalizedStartDate, payoutPosition * 7);
  }

  if (normalizedFrequency === 'biweekly') {
    return addDateDays(normalizedStartDate, payoutPosition * 14);
  }

  return addDateMonths(normalizedStartDate, payoutPosition);
}

export async function listPayoutsForPaluwagan(paluwaganId: string | number) {
  const client = getSupabaseClient();
  const paluwaganIdNumber = Number(paluwaganId);

  const { data, error } = await client
    .from('payouts')
    .select('*')
    .eq('paluwagan_id', paluwaganIdNumber)
    .order('payout_position', { ascending: true });

  if (error) {
    throw error;
  }

  const payoutRows = (data ?? []) as Array<Record<string, any>>;
  const memberIds = payoutRows
    .map((row) => Number(row.recipient_member_id))
    .filter((value) => Number.isFinite(value));
  const memberMap = await fetchMemberDisplayNames(memberIds);

  return payoutRows.map((row) =>
    normalizePayout(row, memberMap.get(Number(row.recipient_member_id)) ?? 'Member'));
}

export async function updatePayoutStatus(
  payoutId: string | number,
  organizerUserId: string | undefined,
  nextStatus: PayoutStatus,
) {
  const client = getSupabaseClient();
  const payoutIdNumber = Number(payoutId);

  const { data: payout, error: payoutError } = await client
    .from('payouts')
    .select('id, paluwagan_id, status, recipient_member_id, completed_at')
    .eq('id', payoutIdNumber)
    .maybeSingle();

  if (payoutError) {
    throw payoutError;
  }

  if (!payout) {
    throw new Error('Payout not found.');
  }

  if (organizerUserId) {
    const { data: paluwagan, error: paluwaganError } = await client
      .from('paluwagans')
      .select('organizer_id')
      .eq('id', Number(payout.paluwagan_id))
      .maybeSingle();

    if (paluwaganError) {
      throw paluwaganError;
    }

    if (!paluwagan || paluwagan.organizer_id !== organizerUserId) {
      throw new Error('Only the organizer can update this payout status.');
    }
  }

  if (payout.status === nextStatus) {
    return normalizePayout(payout as Record<string, any>, null);
  }

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('payouts')
    .update({
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? now : null,
      updated_at: now,
    })
    .eq('id', payoutIdNumber)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const memberNameMap = await fetchMemberDisplayNames([Number(data.recipient_member_id)]);

  return normalizePayout(data, memberNameMap.get(Number(data.recipient_member_id)) ?? 'Member');
}

export async function markPayoutAsPaid(payoutId: string | number, organizerUserId?: string) {
  return updatePayoutStatus(payoutId, organizerUserId, 'completed');
}

export async function generatePayoutOrdersForPaluwagan(paluwaganId: string | number, organizerUserId: string) {
  const client = getSupabaseClient();
  const paluwaganIdNumber = Number(paluwaganId);

  const { data: paluwagan, error: paluwaganError } = await client
    .from('paluwagans')
    .select('id, organizer_id, contribution_amount, start_date, contribution_frequency')
    .eq('id', paluwaganIdNumber)
    .maybeSingle();

  if (paluwaganError) {
    throw paluwaganError;
  }

  if (!paluwagan) {
    throw new Error('Paluwagan not found.');
  }

  if (paluwagan.organizer_id !== organizerUserId) {
    throw new Error('Only the organizer can generate payouts.');
  }

  const { data: members, error: membersError } = await client
    .from('paluwagan_members')
    .select('id, display_name, role, status')
    .eq('paluwagan_id', paluwaganIdNumber)
    .eq('status', 'active');

  if (membersError) {
    throw membersError;
  }

  const activeMembers = ((members ?? []) as Array<Record<string, any>>).filter((member) => {
    const memberId = Number(member.id);
    return Number.isFinite(memberId) && memberId > 0;
  });

  if (activeMembers.length === 0) {
    throw new Error('No active members are available for payout generation.');
  }

  const { data: existingPayoutRows, error: existingPayoutsError } = await client
    .from('payouts')
    .select('id, recipient_member_id, payout_position, status, completed_at')
    .eq('paluwagan_id', paluwaganIdNumber);

  if (existingPayoutsError) {
    throw existingPayoutsError;
  }

  const plan = buildPayoutGenerationPlan({
    activeMemberIds: activeMembers.map((member) => Number(member.id)),
    existingPayouts: (existingPayoutRows ?? []) as Array<Record<string, any>>,
    contributionAmount: Number(paluwagan.contribution_amount ?? 0),
  });

  const payoutIdsToDelete = ((existingPayoutRows ?? []) as Array<Record<string, any>>)
    .filter((payout) => !isPaidPayout(payout))
    .map((payout) => Number(payout.id))
    .filter((payoutId) => Number.isFinite(payoutId) && payoutId > 0);

  if (payoutIdsToDelete.length > 0) {
    const { error: deleteError } = await client.from('payouts').delete().in('id', payoutIdsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  const memberNameMap = new Map<number, string>();
  for (const member of activeMembers) {
    memberNameMap.set(Number(member.id), member.display_name ?? 'Member');
  }

  if (plan.memberIdsToRegenerate.length === 0) {
    return listPayoutsForPaluwagan(paluwaganIdNumber);
  }

  const randomisedMemberIds = shuffle(plan.memberIdsToRegenerate);
  const frequency = (paluwagan.contribution_frequency ?? 'monthly') as string;
  const now = new Date().toISOString();

  const highestPaidPayoutPosition = Math.max(
    0,
    ...((existingPayoutRows ?? [])
      .filter((payout) => isPaidPayout(payout))
      .map((payout) => Number(payout.payout_position))
      .filter((value) => Number.isFinite(value) && value > 0)),
  );
  const nextGeneratedPayoutPosition = highestPaidPayoutPosition + 1;

  const payload = randomisedMemberIds.map((memberId, index) => ({
    paluwagan_id: paluwaganIdNumber,
    recipient_member_id: memberId,
    payout_position: nextGeneratedPayoutPosition + index,
    scheduled_for: getPayoutScheduledDate(paluwagan.start_date, frequency, nextGeneratedPayoutPosition + index),
    amount: plan.totalAmount,
    status: 'scheduled',
    completed_at: null,
    notes: null,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await client.from('payouts').insert(payload);

  if (error) {
    throw error;
  }

  return listPayoutsForPaluwagan(paluwaganIdNumber);
}
