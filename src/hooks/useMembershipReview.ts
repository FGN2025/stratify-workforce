import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type MembershipRequestStatus = Database['public']['Enums']['membership_request_status'];
type CommunityMembershipRole = Database['public']['Enums']['community_membership_role'];

export interface MembershipRequest {
  id: string;
  tenant_id: string;
  user_id: string;
  role: CommunityMembershipRole;
  request_status: MembershipRequestStatus;
  requested_at: string | null;
  joined_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export function useMembershipRequests(tenantId: string | undefined, statusFilter?: MembershipRequestStatus | 'all') {
  return useQuery({
    queryKey: ['membership-requests', tenantId, statusFilter],
    enabled: !!tenantId,
    queryFn: async () => {
      let query = supabase
        .from('community_memberships')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('requested_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('request_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profile data for all users
      const userIds = (data || []).map(m => m.user_id);
      
      let profiles: Record<string, { id: string; username: string | null; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .rpc('get_public_profile_data', { profile_ids: userIds });
        
        (profileData || []).forEach(p => {
          profiles[p.id] = {
            id: p.id,
            username: p.username,
            avatar_url: p.avatar_url,
          };
        });
      }

      return (data || []).map(m => ({
        id: m.id,
        tenant_id: m.tenant_id,
        user_id: m.user_id,
        role: m.role,
        request_status: m.request_status,
        requested_at: m.requested_at,
        joined_at: m.joined_at,
        reviewed_by: m.reviewed_by,
        reviewed_at: m.reviewed_at,
        reviewer_notes: m.reviewer_notes,
        profile: profiles[m.user_id],
      })) as MembershipRequest[];
    },
  });
}

export function useApproveMembership() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      membershipId, 
      tenantId,
      role = 'member',
    }: { 
      membershipId: string; 
      tenantId: string;
      role?: CommunityMembershipRole;
    }) => {
      const { error } = await supabase
        .from('community_memberships')
        .update({
          request_status: 'approved',
          role,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        })
        .eq('id', membershipId);

      if (error) throw error;
      return { membershipId, tenantId };
    },
    onSuccess: ({ tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['membership-requests', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pending-membership-count', tenantId] });
      toast({
        title: 'Member Approved',
        description: 'The membership request has been approved.',
      });
    },
    onError: (error) => {
      console.error('Error approving membership:', error);
      toast({
        title: 'Error',
        description: 'Could not approve membership. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useRejectMembership() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      membershipId, 
      tenantId,
      notes,
    }: { 
      membershipId: string; 
      tenantId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('community_memberships')
        .update({
          request_status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
        })
        .eq('id', membershipId);

      if (error) throw error;
      return { membershipId, tenantId };
    },
    onSuccess: ({ tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['membership-requests', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pending-membership-count', tenantId] });
      toast({
        title: 'Request Rejected',
        description: 'The membership request has been rejected.',
      });
    },
    onError: (error) => {
      console.error('Error rejecting membership:', error);
      toast({
        title: 'Error',
        description: 'Could not reject request. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveMember() {
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
      queryClient.invalidateQueries({ queryKey: ['membership-requests', tenantId] });
      toast({
        title: 'Member Removed',
        description: 'The member has been removed from the community.',
      });
    },
    onError: (error) => {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Could not remove member. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
