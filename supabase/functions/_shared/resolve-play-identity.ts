// Shared Play → Academy identity resolution.
// Used by play-webhook-receiver and credential-api (/passport-link) so the
// two paths never drift. Resolution order:
//   1. play_identity.external_user_id (fast path; bumps last_seen_at)
//   2. Email fallback via get_user_id_by_email RPC, then upserts play_identity
//      keyed on the external_user_id so future lookups hit the fast path.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export type IdentityResolution =
  | { ok: true; userId: string; matchedBy: 'play_identity' | 'email' }
  | { ok: false; reason: string };

export async function resolveIdentity(
  supabase: SupabaseClient,
  externalUserId: string | null,
  email: string | null,
): Promise<IdentityResolution> {
  if (externalUserId) {
    const { data } = await supabase
      .from('play_identity')
      .select('user_id')
      .eq('external_user_id', externalUserId)
      .maybeSingle();
    if (data?.user_id) {
      await supabase
        .from('play_identity')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('external_user_id', externalUserId);
      return { ok: true, userId: data.user_id as string, matchedBy: 'play_identity' };
    }
  }
  if (email) {
    const normalized = email.trim().toLowerCase();
    const { data: userId, error } = await supabase.rpc('get_user_id_by_email', { p_email: normalized });
    if (!error && userId) {
      if (externalUserId) {
        await supabase
          .from('play_identity')
          .upsert(
            {
              user_id: userId as string,
              external_user_id: externalUserId,
              email: normalized,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'external_user_id' },
          );
      }
      return { ok: true, userId: userId as string, matchedBy: 'email' };
    }
  }
  return { ok: false, reason: 'unmapped_identity' };
}
