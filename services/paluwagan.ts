import { getSupabaseClient } from '../lib/supabase';

export const PALUWAGAN_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type PaluwaganFrequency = (typeof PALUWAGAN_FREQUENCIES)[number];
export type PaluwaganStatus = 'active' | 'completed' | 'archived';

export type PaluwaganRecord = {
  id: string;
  name: string;
  description: string | null;
  contribution_amount: number;
  frequency: PaluwaganFrequency;
  contribution_frequency?: PaluwaganFrequency;
  start_date: string;
  status: PaluwaganStatus;
  organizer_id: string;
  created_at: string;
  updated_at: string | null;
};

export type CreatePaluwaganInput = {
  name: string;
  description?: string;
  contribution_amount: number | string;
  frequency: PaluwaganFrequency;
  start_date: string;
};

export type UpdatePaluwaganInput = Partial<CreatePaluwaganInput>;

export function resolvePaluwaganFrequency(
  row?: Partial<PaluwaganRecord> & { contribution_frequency?: string | null; frequency?: string | null },
): PaluwaganFrequency {
  const rawValue = (row?.contribution_frequency ?? row?.frequency ?? 'monthly')?.toString().trim().toLowerCase();
  if (rawValue === 'weekly' || rawValue === 'biweekly' || rawValue === 'monthly') {
    return rawValue;
  }

  return 'monthly';
}

function normalizePaluwaganInput(input: CreatePaluwaganInput) {
  const name = input.name.trim();
  const amount = Number(input.contribution_amount);

  if (!name) {
    throw new Error('Paluwagan name is required.');
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Contribution amount must be greater than zero.');
  }

  if (!input.start_date) {
    throw new Error('Start date is required.');
  }

  return {
    name,
    description: input.description?.trim() || null,
    contribution_amount: Math.round(amount * 100),
    contribution_frequency: input.frequency,
    start_date: input.start_date,
  };
}

export async function createPaluwagan(
  input: CreatePaluwaganInput,
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> },
) {
  const client = getSupabaseClient();
  const userId = user.id;
  const email = user.email?.trim().toLowerCase() ?? '';
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.display_name ??
    user.user_metadata?.name ??
    (email ? email.split('@')[0] : 'Organizer');

  const payload = {
    ...normalizePaluwaganInput(input),
    status: 'active' as const,
    organizer_id: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client.from('paluwagans').insert(payload).select().single();

  if (error) {
    throw error;
  }

  const memberPayload = {
    paluwagan_id: data.id,
    email,
    display_name: displayName,
    role: 'organizer',
    status: 'active',
    created_by: userId,
    joined_at: new Date().toISOString(),
  };

  const { error: memberError } = await client.from('paluwagan_members').insert(memberPayload);

  if (memberError) {
    await client.from('paluwagans').delete().eq('id', data.id);
    throw memberError;
  }

  return data as PaluwaganRecord;
}

export async function listPaluwagansForUser(userId: string, status?: PaluwaganStatus, userEmail?: string) {
  const client = getSupabaseClient();
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const membershipFilters = [`created_by.eq.${userId}`];

  if (normalizedEmail) {
    membershipFilters.push(`email.eq.${normalizedEmail}`);
  }

  const { data: memberships, error: membershipsError } = await client
    .from('paluwagan_members')
    .select('paluwagan_id, email, created_by')
    .or(membershipFilters.join(','));

  if (membershipsError) {
    throw membershipsError;
  }

  const paluwaganIds = Array.from(
    new Set((memberships ?? []).map((row) => Number(row.paluwagan_id)).filter((value) => Number.isFinite(value) && value > 0)),
  );

  if (paluwaganIds.length === 0) {
    return [] as PaluwaganRecord[];
  }

  let query = client.from('paluwagans').select('*').in('id', paluwaganIds);

  if (status) {
    query = query.eq('status', status);
  } else {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PaluwaganRecord[]).map((row) => ({
    ...row,
    frequency: resolvePaluwaganFrequency(row),
  }));
}

export async function getPaluwaganById(paluwaganId: string) {
  const client = getSupabaseClient();

  const { data, error } = await client.from('paluwagans').select('*').eq('id', paluwaganId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...(data as PaluwaganRecord),
    frequency: resolvePaluwaganFrequency(data as Partial<PaluwaganRecord>),
  } as PaluwaganRecord;
}

export async function updatePaluwagan(paluwaganId: string, userId: string, input: UpdatePaluwaganInput) {
  const client = getSupabaseClient();

  const { data: existing, error: existingError } = await client
    .from('paluwagans')
    .select('*')
    .eq('id', paluwaganId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('Paluwagan not found.');
  }

  if (existing.organizer_id !== userId) {
    throw new Error('You can only edit your own Paluwagan.');
  }

  const nextInput = {
    ...existing,
    ...input,
  };

  const normalized = normalizePaluwaganInput({
    name: nextInput.name ?? existing.name,
    description: nextInput.description ?? existing.description ?? '',
    contribution_amount: nextInput.contribution_amount ?? existing.contribution_amount,
    frequency: nextInput.frequency ?? nextInput.contribution_frequency ?? existing.frequency ?? 'monthly',
    start_date: nextInput.start_date ?? existing.start_date,
  });

  const { data, error } = await client
    .from('paluwagans')
    .update({
      ...normalized,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paluwaganId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganRecord;
}

export async function archivePaluwagan(paluwaganId: string, userId: string) {
  const client = getSupabaseClient();

  const { data: existing, error: existingError } = await client
    .from('paluwagans')
    .select('*')
    .eq('id', paluwaganId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('Paluwagan not found.');
  }

  if (existing.organizer_id !== userId) {
    throw new Error('You can only archive your own Paluwagan.');
  }

  const { data, error } = await client
    .from('paluwagans')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paluwaganId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganRecord;
}

export async function unarchivePaluwagan(paluwaganId: string, userId: string) {
  const client = getSupabaseClient();

  const { data: existing, error: existingError } = await client
    .from('paluwagans')
    .select('*')
    .eq('id', paluwaganId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    throw new Error('Paluwagan not found.');
  }

  if (existing.organizer_id !== userId) {
    throw new Error('You can only unarchive your own Paluwagan.');
  }

  const { data, error } = await client
    .from('paluwagans')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', paluwaganId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganRecord;
}

export function formatPeso(amountInCentavos: number | string) {
  const value = Number(amountInCentavos) / 100;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
