import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type EvidenceReviewStatus = Database['public']['Enums']['evidence_review_status'];

export interface EvidenceSubmission {
  id: string;
  completion_id: string;
  user_id: string;
  work_order_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  review_status: EvidenceReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  metadata: Record<string, unknown> | null;
}

export interface EvidenceRequirements {
  required: boolean;
  min_uploads: number;
  max_uploads: number;
  allowed_types: ('image' | 'video' | 'document')[];
  instructions: string;
  deadline_hours: number | null;
}

const MIME_TYPE_MAP: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function getAllowedMimeTypes(allowedTypes: ('image' | 'video' | 'document')[]): string[] {
  return allowedTypes.flatMap(type => MIME_TYPE_MAP[type] || []);
}

export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'document' | 'unknown' {
  for (const [category, mimeTypes] of Object.entries(MIME_TYPE_MAP)) {
    if (mimeTypes.includes(mimeType)) {
      return category as 'image' | 'video' | 'document';
    }
  }
  return 'unknown';
}

export function useEvidenceSubmissions(workOrderId: string, completionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['evidence-submissions', user?.id, workOrderId, completionId],
    enabled: !!user && !!workOrderId,
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('work_order_evidence')
        .select('*')
        .eq('user_id', user.id)
        .eq('work_order_id', workOrderId)
        .order('uploaded_at', { ascending: false });

      if (completionId) {
        query = query.eq('completion_id', completionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(e => ({
        id: e.id,
        completion_id: e.completion_id,
        user_id: e.user_id,
        work_order_id: e.work_order_id,
        file_url: e.file_url,
        file_name: e.file_name,
        file_type: e.file_type,
        file_size: e.file_size,
        uploaded_at: e.uploaded_at,
        review_status: e.review_status,
        reviewed_by: e.reviewed_by,
        reviewed_at: e.reviewed_at,
        reviewer_notes: e.reviewer_notes,
        metadata: e.metadata as Record<string, unknown> | null,
      })) as EvidenceSubmission[];
    },
  });
}

export function useUploadEvidence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      completionId,
      workOrderId,
      file,
    }: {
      completionId: string;
      workOrderId: string;
      file: File;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `evidence-submissions/${workOrderId}/${user.id}/${timestamp}-${sanitizedFileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('media-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media-assets')
        .getPublicUrl(filePath);

      // Create evidence record
      const { data, error } = await supabase
        .from('work_order_evidence')
        .insert({
          completion_id: completionId,
          user_id: user.id,
          work_order_id: workOrderId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['evidence-submissions', user?.id, variables.workOrderId] 
      });
    },
  });
}

export function useDeleteEvidence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      workOrderId,
      fileUrl,
    }: {
      evidenceId: string;
      workOrderId: string;
      fileUrl: string;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Extract file path from URL
      const urlParts = fileUrl.split('/media-assets/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        // Delete from storage
        await supabase.storage
          .from('media-assets')
          .remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('work_order_evidence')
        .delete()
        .eq('id', evidenceId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['evidence-submissions', user?.id, variables.workOrderId] 
      });
    },
  });
}
