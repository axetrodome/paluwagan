import type { User } from '@supabase/supabase-js';

import { upsertProfileFromUser } from '../services/profile';

export function profileName(user: User) {
  const metadataName =
    user.user_metadata?.display_name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim();
  return user.email?.split('@')[0] ?? 'Member';
}

export async function ensureProfile(user: User) {
  await upsertProfileFromUser(user);
}
