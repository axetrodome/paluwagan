import type { User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../lib/supabase';

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export function getInitials(name?: string | null, email?: string | null) {
  const source = (name ?? email ?? 'Member').trim();
  if (!source) return 'M';

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'M';

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0].slice(0, 1)}${words[words.length - 1].slice(0, 1)}`.toUpperCase();
}

export async function getProfileByUserId(userId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Could not load profile:', error.message);
    return null;
  }

  return data as ProfileRecord | null;
}

export async function upsertProfileFromUser(user: User) {
  const client = getSupabaseClient();
  const profileName =
    user.user_metadata?.display_name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Member';

  const payload = {
    id: user.id,
    display_name: profileName,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client.from('profiles').upsert(payload, { onConflict: 'id' }).select().maybeSingle();

  if (error) {
    console.warn('Could not create profile:', error.message);
    return null;
  }

  return data as ProfileRecord | null;
}

export async function updateProfileDisplayName(userId: string, displayName: string) {
  const client = getSupabaseClient();
  const trimmed = displayName.trim();
  if (!trimmed) return null;

  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Could not update profile:', error.message);
    return null;
  }

  return data as ProfileRecord | null;
}
