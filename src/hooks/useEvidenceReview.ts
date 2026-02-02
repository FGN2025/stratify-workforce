import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type EvidenceReviewStatus = Database['public']['Enums']['evidence_review_status'];

export interface EvidenceItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  review_status: EvidenceReviewStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_id: string;
  work_order_id: string;
  completion_id: string;
  metadata: Record<string, unknown> | null;
  // Joined data
  user_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
  work_order?: {
    title: string;
    game_title: string;
  };
}

interface UseEvidenceReviewOptions {
  statusFilter?: EvidenceReviewStatus | 'all';
  workOrderId?: string;
}

export function useEvidenceReview(options: UseEvidenceReviewOptions = {}) {
  const { statusFilter = 'pending', workOrderId } = options;

  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchEvidence = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch evidence first
      let query = supabase
        .from('work_order_evidence')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('review_status', statusFilter);
      }

      if (workOrderId) {
        query = query.eq('work_order_id', workOrderId);
      }

      const { data: evidenceData, error } = await query;

      if (error) throw error;

      // Fetch related profiles and work orders
      const userIds = [...new Set((evidenceData || []).map(e => e.user_id))];
      const workOrderIds = [...new Set((evidenceData || []).map(e => e.work_order_id))];

      const [profilesRes, workOrdersRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
          : Promise.resolve({ data: [] }),
        workOrderIds.length > 0
          ? supabase.from('work_orders').select('id, title, game_title').in('id', workOrderIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map(
        (profilesRes.data || []).map(p => [p.id, { username: p.username, avatar_url: p.avatar_url }])
      );
      const workOrdersMap = new Map(
        (workOrdersRes.data || []).map(w => [w.id, { title: w.title, game_title: w.game_title }])
      );

      const formattedEvidence: EvidenceItem[] = (evidenceData || []).map((item) => ({
        id: item.id,
        file_name: item.file_name,
        file_url: item.file_url,
        file_type: item.file_type,
        file_size: item.file_size,
        uploaded_at: item.uploaded_at,
        review_status: item.review_status,
        reviewer_notes: item.reviewer_notes,
        reviewed_at: item.reviewed_at,
        reviewed_by: item.reviewed_by,
        user_id: item.user_id,
        work_order_id: item.work_order_id,
        completion_id: item.completion_id,
        metadata: item.metadata as Record<string, unknown> | null,
        user_profile: profilesMap.get(item.user_id),
        work_order: workOrdersMap.get(item.work_order_id),
      }));

      setEvidence(formattedEvidence);
    } catch (error) {
      console.error('Error fetching evidence:', error);
      toast({
        title: 'Error',
        description: 'Failed to load evidence submissions.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, workOrderId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const updateReviewStatus = async (
    evidenceId: string,
    status: EvidenceReviewStatus,
    notes?: string
  ) => {
    setIsUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: {
        review_status: EvidenceReviewStatus;
        reviewed_by: string;
        reviewed_at: string;
        reviewer_notes?: string;
      } = {
        review_status: status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (notes !== undefined) {
        updateData.reviewer_notes = notes;
      }

      const { error } = await supabase
        .from('work_order_evidence')
        .update(updateData)
        .eq('id', evidenceId);

      if (error) throw error;

      // Update local state
      setEvidence((prev) =>
        prev.map((item) =>
          item.id === evidenceId
            ? {
                ...item,
                review_status: status,
                reviewed_by: user.id,
                reviewed_at: updateData.reviewed_at,
                reviewer_notes: notes ?? item.reviewer_notes,
              }
            : item
        )
      );

      const statusLabels: Record<EvidenceReviewStatus, string> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        needs_revision: 'Needs Revision',
      };

      toast({
        title: 'Review Updated',
        description: `Evidence marked as ${statusLabels[status]}.`,
      });

      return true;
    } catch (error) {
      console.error('Error updating review status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update review status.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const approveEvidence = (evidenceId: string, notes?: string) =>
    updateReviewStatus(evidenceId, 'approved', notes);

  const rejectEvidence = (evidenceId: string, notes: string) =>
    updateReviewStatus(evidenceId, 'rejected', notes);

  const requestRevision = (evidenceId: string, notes: string) =>
    updateReviewStatus(evidenceId, 'needs_revision', notes);

  const pendingCount = evidence.filter((e) => e.review_status === 'pending').length;

  return {
    evidence,
    isLoading,
    isUpdating,
    refetch: fetchEvidence,
    approveEvidence,
    rejectEvidence,
    requestRevision,
    pendingCount,
  };
}
