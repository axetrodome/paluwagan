import { getSupabaseClient } from '../lib/supabase';

/** Permanently deletes the signed-in user's account via the delete-account Edge Function. */
export async function deleteOwnAccount() {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke('delete-account', { method: 'POST' });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}
