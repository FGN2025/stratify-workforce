import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MembershipRequestStatus = Database['public']['Enums']['membership_request_status'];
type CommunityMembershipRole = Database['public']['Enums']['community_membership_role'];

export interface MembershipStatus {
  id: string;
  tenant_id: string;
  user_id: string;
  role: CommunityMembershipRole;
  request_status: MembershipRequestStatus;
  requested_at: string;
  joined_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export function useMembershipStatus(tenantId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['membership-status', tenantId, user?.id],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_memberships')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        role: data.role,
        request_status: data.request_status,
        requested_at: data.requested_at,
        joined_at: data.joined_at,
        reviewed_by: data.reviewed_by,
        reviewed_at: data.reviewed_at,
        reviewer_notes: data.reviewer_notes,
      } as MembershipStatus;
    },
  });
}

export function useRequestMembership() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('community_memberships')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          role: 'member',
          request_status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['membership-status', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      toast({
        title: 'Request Submitted',
        description: 'Your membership request has been sent to the community managers.',
      });
    },
    onError: (error) => {
      console.error('Error requesting membership:', error);
      toast({
        title: 'Request Failed',
        description: 'Could not submit membership request. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCancelMembershipRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, tenantId }: { membershipId: string; tenantId: string }) => {
      const { error } = await supabase
        .from('community_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
      return tenantId;
    },
    onSuccess: (tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['membership-status', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      toast({
        title: 'Request Cancelled',
        description: 'Your membership request has been cancelled.',
      });
    },
    onError: (error) => {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Error',
        description: 'Could not cancel request. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useIsManager(tenantId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-manager', tenantId, user?.id],
    enabled: !!tenantId && !!user?.id,
    queryFn: async () => {
      // Check if user has manager/admin/owner role in this community
      const { data, error } = await supabase
        .from('community_memberships')
        .select('role, request_status')
        .eq('tenant_id', tenantId!)
        .eq('user_id', user!.id)
        .eq('request_status', 'approved')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return false;
      
      return ['manager', 'admin', 'owner'].includes(data.role);
    },
  });
}
