import { getSupabaseClient } from '../lib/supabase';

export type PaluwaganMemberRole = 'organizer' | 'member';
export type PaluwaganMemberStatus = 'active' | 'pending' | 'inactive' | 'archived';

export type PaluwaganMemberRecord = {
  id: number;
  paluwagan_id: number;
  email: string;
  display_name: string;
  phone: string | null;
  role: PaluwaganMemberRole;
  status: PaluwaganMemberStatus;
  created_by: string;
  joined_at: string;
  created_at: string;
  updated_at: string | null;
};

export type CreatePaluwaganMemberInput = {
  display_name: string;
  email: string;
  phone?: string | null;
  role?: PaluwaganMemberRole;
};

export type UpdatePaluwaganMemberInput = {
  display_name?: string;
  email?: string;
  phone?: string | null;
  role?: PaluwaganMemberRole;
  status?: PaluwaganMemberStatus;
};

export async function createPaluwaganMember(
  paluwaganId: string | number,
  createdByUserId: string,
  input: CreatePaluwaganMemberInput,
) {
  const client = getSupabaseClient();
  const displayName = input.display_name.trim();
  const email = input.email.trim().toLowerCase();

  if (!displayName) {
    throw new Error('Member name is required.');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  const { data, error } = await client
    .from('paluwagan_members')
    .insert({
      paluwagan_id: Number(paluwaganId),
      email,
      display_name: displayName,
      phone: input.phone?.trim() || null,
      role: input.role ?? 'member',
      status: 'active',
      created_by: createdByUserId,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganMemberRecord;
}

export function normalizeDisplayName(rawName: string | null | undefined) {
  const cleaned = rawName?.trim();
  const lowered = cleaned?.toLowerCase();

  if (cleaned && lowered !== 'member' && lowered !== 'member@example.com') {
    return cleaned;
  }

  return 'Member';
}

export async function listPaluwaganMembers(paluwaganId: string | number) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('paluwagan_members')
    .select('*')
    .eq('paluwagan_id', Number(paluwaganId))
    .order('joined_at', { ascending: true });

  if (error) {
    throw error;
  }

  const members = ((data ?? []) as (Partial<PaluwaganMemberRecord> & { role?: string; status?: string })[]).map(
    (member) => ({
      ...member,
      id: Number(member.id),
      paluwagan_id: Number(member.paluwagan_id),
      email: member.email ?? '',
      display_name: normalizeDisplayName(member.display_name),
      phone: member.phone ?? null,
      role: member.role === 'organizer' ? 'organizer' : 'member',
      status:
        member.status === 'archived'
          ? 'archived'
          : member.status === 'pending'
            ? 'pending'
            : member.status === 'inactive'
              ? 'inactive'
              : 'active',
      created_by: member.created_by ?? '',
      joined_at: member.joined_at ?? new Date().toISOString(),
      created_at: member.created_at ?? new Date().toISOString(),
      updated_at: member.updated_at ?? null,
    } as PaluwaganMemberRecord),
  );

  return members;
}

export async function updatePaluwaganMember(memberId: number, input: UpdatePaluwaganMemberInput) {
  const client = getSupabaseClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.display_name !== undefined) {
    const nextName = input.display_name.trim();
    if (!nextName) {
      throw new Error('Member name is required.');
    }
    payload.display_name = nextName;
  }

  if (input.email !== undefined) {
    const nextEmail = input.email.trim().toLowerCase();
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    payload.email = nextEmail;
  }

  if (input.phone !== undefined) {
    payload.phone = input.phone?.trim() || null;
  }

  if (input.role !== undefined) {
    payload.role = input.role;
  }

  if (input.status !== undefined) {
    payload.status = input.status;
  }

  const { data, error } = await client
    .from('paluwagan_members')
    .update(payload)
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganMemberRecord;
}

export async function deletePaluwaganMember(memberId: number) {
  const client = getSupabaseClient();

  const { error } = await client.from('paluwagan_members').delete().eq('id', memberId);

  if (error) {
    throw error;
  }

  return true;
}

export async function updatePaluwaganMemberStatus(
  memberId: number,
  status: PaluwaganMemberStatus,
  actorUserId: string,
) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('paluwagan_members')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as PaluwaganMemberRecord;
}
