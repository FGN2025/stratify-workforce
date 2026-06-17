import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CommunitySetupData {
  // identity
  name?: string;
  slug?: string;
  description?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  brand_color?: string;
  // corporate
  legal_name?: string | null;
  dba?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  hq_street?: string | null;
  hq_city?: string | null;
  hq_state?: string | null;
  hq_zip?: string | null;
  hq_country?: string | null;
  website_url?: string | null;
  // taxonomy
  industries?: string[];
  // wizard state
  setup_step?: number;
  setup_completed_at?: string | null;
}

export function useCommunitySetup(tenantId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['community-setup', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as unknown as CommunitySetupData & { id: string };
    },
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<CommunitySetupData>) => {
      if (!tenantId) throw new Error('No tenant');
      const { error } = await supabase
        .from('tenants')
        .update(patch as never)
        .eq('id', tenantId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-setup', tenantId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  return { data: query.data, isLoading: query.isLoading, save: mutation.mutateAsync, isSaving: mutation.isPending };
}
