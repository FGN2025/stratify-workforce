import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Two-letter state code from the signed-in user's most recent saved address. */
export function useUserState() {
  const { user, session } = useAuth();
  return useQuery({
    queryKey: ['user-state', user?.id, session?.access_token],
    enabled: !!user && !!session?.access_token,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_addresses')
        .select('state')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const s = (data?.state ?? '').trim().toUpperCase();
      return /^[A-Z]{2}$/.test(s) ? s : null;
    },
  });
}

export const WORKFORCE_MAP_BASE = 'https://workforce.fgn.academy/';

export function workforceMapUrl(sectorId?: string | null, state?: string | null) {
  const p = new URLSearchParams({ metric: 'workforce' });
  if (sectorId) p.set('trade', sectorId);
  if (state) p.set('state', state);
  return `${WORKFORCE_MAP_BASE}?${p.toString()}`;
}
