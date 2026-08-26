import * as FileSystem from 'expo-file-system';

import { getSupabaseClient } from '../lib/supabase';
import { normalizeDisplayName } from './members';

export const CONTRIBUTION_PERIOD_STATUSES = ['open', 'closed', 'draft'] as const;
export type ContributionPeriodStatus = (typeof CONTRIBUTION_PERIOD_STATUSES)[number];

export type ContributionPeriodRecord = {
  id: number;
  paluwagan_id: number;
  period_number: number;
  due_date: string;
  amount_due: number;
  status: ContributionPeriodStatus;
  created_at: string;
  updated_at: string;
};

export type ContributionStatus = 'unpaid' | 'partial' | 'submitted' | 'paid' | 'overdue' | 'rejected';

export type ContributionRecord = {
  id: number;
  contribution_period_id: number;
  member_id: number;
  member_name: string;
  member_email: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: ContributionStatus;
  notes: string | null;
  paid_at: string | null;
  proof_path: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateContributionPeriodInput = {
  period_number?: number | string;
  due_date: string;
  amount_due: number | string;
  status?: ContributionPeriodStatus;
};

function normalizeContributionPeriodInput(input: CreateContributionPeriodInput) {
  if (!input.due_date) {
    throw new Error('Due date is required.');
  }

  const periodNumber = input.period_number === undefined || input.period_number === null || input.period_number === ''
    ? 1
    : Number(input.period_number);

  const amount = Number(input.amount_due);

  if (!Number.isFinite(periodNumber) || periodNumber <= 0) {
    throw new Error('Period number must be greater than zero.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount due must be greater than zero.');
  }

  return {
    period_number: Math.trunc(periodNumber),
    due_date: input.due_date,
    amount_due: Math.round(amount * 100),
    status: input.status ?? 'open',
  };
}

export async function listContributionPeriods(paluwaganId: string | number) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('contribution_periods')
    .select('*')
    .eq('paluwagan_id', Number(paluwaganId))
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Partial<ContributionPeriodRecord>>).map((row) => ({
    id: Number(row.id),
    paluwagan_id: Number(row.paluwagan_id),
    period_number: Number(row.period_number ?? 1),
    due_date: row.due_date ?? '',
    amount_due: Number(row.amount_due ?? 0),
    status: (row.status as ContributionPeriodStatus) ?? 'open',
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }));
}

export async function getNextPeriodNumber(paluwaganId: string | number) {
  const periods = await listContributionPeriods(paluwaganId);

  if (periods.length === 0) {
    return 1;
  }

  return Math.max(...periods.map((period) => Number(period.period_number))) + 1;
}

export async function getContributionPeriodById(paluwaganId: string | number, periodId: string | number) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('contribution_periods')
    .select('*')
    .eq('paluwagan_id', Number(paluwaganId))
    .eq('id', Number(periodId))
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    paluwagan_id: Number(data.paluwagan_id),
    period_number: Number(data.period_number ?? 1),
    due_date: data.due_date ?? '',
    amount_due: Number(data.amount_due ?? 0),
    status: (data.status as ContributionPeriodStatus) ?? 'open',
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? data.created_at ?? new Date().toISOString(),
  } as ContributionPeriodRecord;
}

export async function listContributionPeriodMembers(paluwaganId: string | number, periodId: string | number) {
  const client = getSupabaseClient();

  const { data: period, error: periodError } = await client
    .from('contribution_periods')
    .select('id, amount_due, due_date')
    .eq('id', Number(periodId))
    .eq('paluwagan_id', Number(paluwaganId))
    .maybeSingle();

  if (periodError) {
    throw periodError;
  }

  if (!period) {
    throw new Error('Contribution period not found.');
  }

  const { data, error } = await client
    .from('contributions')
    .select('*')
    .eq('contribution_period_id', Number(periodId))
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const memberIds = Array.from(
    new Set(
      ((data ?? []) as Array<{ member_id?: number | null }>).map((row) => Number(row.member_id)).filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

  let memberMap = new Map<number, { display_name: string; email: string }>();

  if (memberIds.length > 0) {
    const { data: members, error: membersError } = await client
      .from('paluwagan_members')
      .select('id, display_name, email')
      .in('id', memberIds);

    if (membersError) {
      throw membersError;
    }

    for (const member of members ?? []) {
      memberMap.set(Number(member.id), {
        display_name: normalizeDisplayName(member.display_name),
        email: member.email ?? '',
      });
    }
  }

  return ((data ?? []) as Array<Record<string, any>>).map((row) => {
    const memberId = Number(row.member_id ?? 0);
    const member = memberMap.get(memberId) ?? { display_name: normalizeDisplayName(null), email: '' };

    return {
      id: Number(row.id),
      contribution_period_id: Number(row.contribution_period_id ?? periodId),
      member_id: memberId,
      member_name: member.display_name,
      member_email: member.email,
      amount_due: Number(period?.amount_due ?? 0),
      amount_paid: Number(row.amount_paid ?? 0),
      due_date: period?.due_date ?? '',
      status: (row.status as ContributionStatus) ?? 'unpaid',
      notes: row.notes ?? null,
      paid_at: row.paid_at ?? null,
      proof_path: row.proof_path ?? null,
      verified_by: row.verified_by ?? null,
      verified_at: row.verified_at ?? null,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    } as ContributionRecord;
  });
}

export async function getContributionProofUrl(proofPath: string | null | undefined) {
  if (!proofPath) {
    return null;
  }

  try {
    const client = getSupabaseClient();
    const { data: signedData, error: signedError } = await client.storage
      .from('payment-proofs')
      .createSignedUrl(proofPath, 60 * 60 * 24);

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    const { data } = client.storage.from('payment-proofs').getPublicUrl(proofPath);
    return data?.publicUrl ?? null;
  } catch {
    return null;
  }
}

export async function deleteContributionProof(proofPath: string | null | undefined) {
  if (!proofPath) {
    return false;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.storage.from('payment-proofs').remove([proofPath]);
    return !error;
  } catch {
    return false;
  }
}

export async function uploadContributionProof({
  contributionId,
  paluwaganId,
  periodId,
  fileUri,
  fileName,
  fileType,
  fileBase64,
}: {
  contributionId: number;
  paluwaganId: string | number;
  periodId: string | number;
  fileUri: string;
  fileName?: string;
  fileType?: string;
  fileBase64?: string | null;
}) {
  const client = getSupabaseClient();

  const mimeType = (fileType && fileType.startsWith('image/')) ? fileType : 'image/jpeg';

  const originalName = (fileName ?? `proof-${contributionId}-${Date.now()}`)
    .trim() || `proof-${contributionId}-${Date.now()}`;

  const normalizedFileName = originalName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001F\u007F]+/g, '')
    .trim() || `proof-${contributionId}-${Date.now()}`;

  const extension = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('gif')
        ? 'gif'
        : 'jpg';

  const finalFileName = normalizedFileName.toLowerCase().endsWith(`.${extension}`)
    ? normalizedFileName
    : `${normalizedFileName}.${extension}`;

  const storagePath = `paluwagans/${Number(paluwaganId)}/periods/${Number(periodId)}/contributions/${contributionId}/${finalFileName}`;

  const existingContribution = await client
    .from('contributions')
    .select('proof_path')
    .eq('id', contributionId)
    .maybeSingle();

  if (existingContribution?.data?.proof_path && existingContribution.data.proof_path !== storagePath) {
    await deleteContributionProof(existingContribution.data.proof_path);
  }

  let binary: Uint8Array;

  if (fileBase64) {
    const cleanedBase64 = fileBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    binary = Uint8Array.from(atob(cleanedBase64), (char) => char.charCodeAt(0));
  } else {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64' as any,
    });
    binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  }

  const { error: uploadError } = await client.storage.from('payment-proofs').upload(storagePath, binary, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: currentContribution } = await client
    .from('contributions')
    .select('amount_paid, status, amount_due')
    .eq('id', contributionId)
    .maybeSingle();

  const nextStatus =
    currentContribution && Number(currentContribution.amount_paid ?? 0) >= Number(currentContribution.amount_due ?? 0)
      ? 'paid'
      : currentContribution?.status === 'partial' || currentContribution?.status === 'submitted'
        ? 'submitted'
        : 'submitted';

  const updated = await updateContributionRecord(contributionId, {
    proof_path: storagePath,
    status: nextStatus,
  });

  const publicUrl = await getContributionProofUrl(storagePath);

  return {
    path: storagePath,
    publicUrl,
    updated,
  };
}

export async function updateContributionRecord(
  contributionId: number,
  input: {
    amount_due?: number;
    amount_paid?: number;
    status?: ContributionStatus;
    notes?: string | null;
    paid_at?: string | null;
    proof_path?: string | null;
    verified_by?: string | null;
    verified_at?: string | null;
  },
) {
  const client = getSupabaseClient();

  const { data: currentContribution, error: currentContributionError } = await client
    .from('contributions')
    .select('member_id, amount_paid, status, notes, paid_at, proof_path, verified_by, verified_at')
    .eq('id', contributionId)
    .maybeSingle();

  if (currentContributionError) {
    throw currentContributionError;
  }

  const amountDue = Math.max(0, Number(input.amount_due ?? 0));
  const nextAmountPaid = Math.max(0, Math.round(Number(input.amount_paid ?? currentContribution?.amount_paid ?? 0)));

  const computedStatus: ContributionStatus = input.status
    ?? (nextAmountPaid <= 0
      ? 'unpaid'
      : amountDue > 0 && nextAmountPaid >= amountDue
        ? 'paid'
        : 'partial');

  const nextNotes = typeof input.notes === 'string' ? input.notes.trim() : null;
  const { data, error } = await client
    .from('contributions')
    .update({
      amount_paid: nextAmountPaid,
      status: computedStatus,
      notes: nextNotes && nextNotes.length > 0 ? nextNotes : null,
      paid_at: input.paid_at ?? (nextAmountPaid > 0 ? new Date().toISOString() : null),
      proof_path: input.proof_path ?? null,
      verified_by: input.verified_by ?? null,
      verified_at: input.verified_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const memberId = Number(data.member_id ?? currentContribution?.member_id ?? 0);
  let memberName = 'Member';
  let memberEmail = '';

  if (memberId > 0) {
    const { data: memberRecord, error: memberError } = await client
      .from('paluwagan_members')
      .select('display_name, email')
      .eq('id', memberId)
      .maybeSingle();

    if (!memberError && memberRecord) {
      memberName = normalizeDisplayName(memberRecord.display_name);
      memberEmail = memberRecord.email ?? '';
    }
  }

  return {
    id: Number(data.id),
    contribution_period_id: Number(data.contribution_period_id ?? 0),
    member_id: memberId,
    member_name: memberName,
    member_email: memberEmail,
    amount_due: Number(data.amount_due ?? amountDue),
    amount_paid: Number(data.amount_paid ?? nextAmountPaid),
    due_date: data.due_date ?? '',
    status: (data.status as ContributionStatus) ?? computedStatus,
    notes: data.notes ?? null,
    paid_at: data.paid_at ?? null,
    proof_path: data.proof_path ?? null,
    verified_by: data.verified_by ?? null,
    verified_at: data.verified_at ?? null,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? data.created_at ?? new Date().toISOString(),
  } as ContributionRecord;
}

export async function updateContributionPeriod(
  paluwaganId: string | number,
  actorUserId: string,
  periodId: string | number,
  input: CreateContributionPeriodInput,
) {
  const client = getSupabaseClient();

  const { data: paluwagan, error: paluwaganError } = await client
    .from('paluwagans')
    .select('id, organizer_id')
    .eq('id', Number(paluwaganId))
    .maybeSingle();

  if (paluwaganError) {
    throw paluwaganError;
  }

  if (!paluwagan) {
    throw new Error('Paluwagan not found.');
  }

  if (paluwagan.organizer_id !== actorUserId) {
    throw new Error('You can only edit periods for your own Paluwagan.');
  }

  const existingPeriod = await getContributionPeriodById(paluwaganId, periodId);
  if (!existingPeriod) {
    throw new Error('Contribution period not found.');
  }

  const normalized = normalizeContributionPeriodInput(input);

  const { data, error } = await client
    .from('contribution_periods')
    .update({
      ...normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', Number(periodId))
    .eq('paluwagan_id', Number(paluwaganId))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ContributionPeriodRecord;
}

export async function closeContributionPeriod(
  paluwaganId: string | number,
  actorUserId: string,
  periodId: string | number,
) {
  const client = getSupabaseClient();

  const { data: paluwagan, error: paluwaganError } = await client
    .from('paluwagans')
    .select('id, organizer_id')
    .eq('id', Number(paluwaganId))
    .maybeSingle();

  if (paluwaganError) {
    throw paluwaganError;
  }

  if (!paluwagan) {
    throw new Error('Paluwagan not found.');
  }

  if (paluwagan.organizer_id !== actorUserId) {
    throw new Error('You can only close periods for your own Paluwagan.');
  }

  const existingPeriod = await getContributionPeriodById(paluwaganId, periodId);
  if (!existingPeriod) {
    throw new Error('Contribution period not found.');
  }

  if (existingPeriod.status === 'closed') {
    throw new Error('This period is already closed and is read-only.');
  }

  const { data, error } = await client
    .from('contribution_periods')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', Number(periodId))
    .eq('paluwagan_id', Number(paluwaganId))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ContributionPeriodRecord;
}

export async function deleteContributionPeriod(
  paluwaganId: string | number,
  actorUserId: string,
  periodId: string | number,
) {
  const client = getSupabaseClient();

  const { data: paluwagan, error: paluwaganError } = await client
    .from('paluwagans')
    .select('id, organizer_id')
    .eq('id', Number(paluwaganId))
    .maybeSingle();

  if (paluwaganError) {
    throw paluwaganError;
  }

  if (!paluwagan) {
    throw new Error('Paluwagan not found.');
  }

  if (paluwagan.organizer_id !== actorUserId) {
    throw new Error('You can only delete periods for your own Paluwagan.');
  }

  const existingPeriod = await getContributionPeriodById(paluwaganId, periodId);
  if (!existingPeriod) {
    throw new Error('Contribution period not found.');
  }

  const { error } = await client
    .from('contribution_periods')
    .delete()
    .eq('id', Number(periodId))
    .eq('paluwagan_id', Number(paluwaganId));

  if (error) {
    throw error;
  }
}

export async function createContributionPeriod(
  paluwaganId: string | number,
  actorUserId: string,
  input: CreateContributionPeriodInput,
) {
  const client = getSupabaseClient();

  const { data: paluwagan, error: paluwaganError } = await client
    .from('paluwagans')
    .select('id, organizer_id')
    .eq('id', Number(paluwaganId))
    .maybeSingle();

  if (paluwaganError) {
    throw paluwaganError;
  }

  if (!paluwagan) {
    throw new Error('Paluwagan not found.');
  }

  if (paluwagan.organizer_id !== actorUserId) {
    throw new Error('You can only create periods for your own Paluwagan.');
  }

  const fallbackPeriodNumber = await getNextPeriodNumber(paluwaganId);
  const normalized = normalizeContributionPeriodInput({
    ...input,
    period_number: input.period_number ?? fallbackPeriodNumber,
  });

  const { data, error } = await client
    .from('contribution_periods')
    .insert({
      paluwagan_id: Number(paluwaganId),
      ...normalized,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { data: members, error: membersError } = await client
    .from('paluwagan_members')
    .select('id, display_name, email')
    .eq('paluwagan_id', Number(paluwaganId))
    .eq('status', 'active');

  if (membersError) {
    await client.from('contribution_periods').delete().eq('id', data.id);
    throw membersError;
  }

  const now = new Date().toISOString();
  const rows = (members ?? []).map((member) => ({
    contribution_period_id: Number(data.id),
    member_id: Number(member.id),
    amount_paid: 0,
    status: 'unpaid' as const,
    paid_at: null,
    proof_path: null,
    created_at: now,
    updated_at: now,
  }));

  const { error: contributionError } = await client.from('contributions').insert(rows);

  if (contributionError) {
    await client.from('contributions').delete().eq('contribution_period_id', Number(data.id));
    await client.from('contribution_periods').delete().eq('id', data.id);
    throw contributionError;
  }

  return data as ContributionPeriodRecord;
}
