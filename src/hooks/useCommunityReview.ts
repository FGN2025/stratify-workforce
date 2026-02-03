import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tenant, CommunityApprovalStatus } from '@/types/tenant';

export interface CommunityReviewItem extends Tenant {
  owner_profile?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface UseCommunityReviewOptions {
  statusFilter: CommunityApprovalStatus | 'all';
}

export function useCommunityReview({ statusFilter }: UseCommunityReviewOptions) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: communities = [], isLoading, refetch } = useQuery({
    queryKey: ['community-review', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch owner profiles
      const ownerIds = [...new Set(data?.filter(c => c.owner_id).map(c => c.owner_id))];
      let profilesMap: Record<string, { username: string | null; avatar_url: string | null }> = {};

      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', ownerIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { username: p.username, avatar_url: p.avatar_url };
            return acc;
          }, {} as typeof profilesMap);
        }
      }

      return (data || []).map(community => ({
        ...community,
        owner_profile: community.owner_id ? profilesMap[community.owner_id] || null : null,
      })) as CommunityReviewItem[];
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-community-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });

  const updateCommunityStatus = async (
    communityId: string,
    status: CommunityApprovalStatus,
    notes?: string
  ): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = {
        approval_status: status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (notes !== undefined) {
        updateData.reviewer_notes = notes;
      }

      // Also set is_verified = true when approving
      if (status === 'approved') {
        updateData.is_verified = true;
      }

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', communityId);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['community-review'] });
      queryClient.invalidateQueries({ queryKey: ['pending-community-count'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });

      return true;
    } catch (error: any) {
      console.error('Error updating community status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update community status.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const approveCommunity = async (id: string, notes?: string): Promise<boolean> => {
    const success = await updateCommunityStatus(id, 'approved', notes);
    if (success) {
      toast({
        title: 'Community Approved',
        description: 'The community is now publicly visible.',
      });
    }
    return success;
  };

  const rejectCommunity = async (id: string, notes: string): Promise<boolean> => {
    if (!notes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please provide rejection notes.',
        variant: 'destructive',
      });
      return false;
    }

    const success = await updateCommunityStatus(id, 'rejected', notes);
    if (success) {
      toast({
        title: 'Community Rejected',
        description: 'The submitter will be notified.',
      });
    }
    return success;
  };

  const requestRevision = async (id: string, notes: string): Promise<boolean> => {
    if (!notes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please provide revision notes.',
        variant: 'destructive',
      });
      return false;
    }

    const success = await updateCommunityStatus(id, 'needs_revision', notes);
    if (success) {
      toast({
        title: 'Revision Requested',
        description: 'The submitter will be notified to update their submission.',
      });
    }
    return success;
  };

  return {
    communities,
    isLoading,
    isUpdating,
    pendingCount,
    refetch,
    approveCommunity,
    rejectCommunity,
    requestRevision,
  };
}
