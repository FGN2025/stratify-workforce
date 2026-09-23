import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StructuredField = {
  key: string;
  label: string;
  type: 'number' | 'integer' | 'text' | 'select';
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  order?: number;
  reviewer_guidance?: string;
};

export type ResponseSchema = { version?: number; title?: string; fields: StructuredField[] } | null;

export type EvidenceRequirementRow = {
  id: string;
  task_id: string;
  requirement_key: string;
  label: string;
  instructions: string | null;
  accepted_evidence_types: string[];
  evidence_basis: string;
  is_required: boolean;
  min_artifacts: number;
  min_duration_seconds: number | null;
  order_index: number;
  response_schema: ResponseSchema;
  criteria: {
    id: string;
    criterion_key: string;
    criterion_text: string;
    guidance_for_reviewer: string | null;
    is_gating: boolean;
    order_index: number;
  }[];
};

export type ArtifactRow = {
  id: string;
  title: string | null;
  artifact_kind: string;
  storage_path: string | null;
  mime_type: string | null;
  body_text: string | null;
  body_structured: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export type AssociationRow = {
  id: string;
  artifact_id: string;
  requirement_id: string;
  completion_id: string | null;
  association_status: string;
  learner_rationale: string | null;
  timecode_start_seconds: number | null;
  timecode_end_seconds: number | null;
  frame_reference: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type DemonstrationRow = {
  id: string;
  task_id: string;
  completion_id: string;
  status: string;
  demonstrated_at: string | null;
  review_completed_at: string | null;
};

/** Per-task evidence requirements + criteria for a work order (Phase 2 authored content). */
export function useTaskEvidenceRequirements(workOrderId?: string) {
  return useQuery({
    queryKey: ['task-evidence-requirements', workOrderId],
    enabled: !!workOrderId,
    queryFn: async (): Promise<EvidenceRequirementRow[]> => {
      const { data: tasks, error: tErr } = await supabase
        .from('work_order_tasks')
        .select('id')
        .eq('work_order_id', workOrderId!);
      if (tErr) throw tErr;
      const taskIds = (tasks ?? []).map((t) => t.id);
      if (!taskIds.length) return [];

      const { data: reqs, error: rErr } = await supabase
        .from('work_order_task_evidence_requirements')
        .select('*')
        .in('task_id', taskIds)
        .eq('is_active', true)
        .order('order_index');
      if (rErr) throw rErr;
      if (!reqs?.length) return [];

      const { data: criteria, error: cErr } = await supabase
        .from('assessment_criteria')
        .select('*')
        .in('requirement_id', reqs.map((r) => r.id))
        .eq('is_active', true)
        .order('order_index');
      if (cErr) throw cErr;

      return reqs.map((r) => ({
        ...(r as unknown as EvidenceRequirementRow),
        criteria: (criteria ?? []).filter((c) => c.requirement_id === r.id) as EvidenceRequirementRow['criteria'],
      }));
    },
  });
}

/** Everything the learner has submitted for one attempt. */
export function useAttemptEvidence(workOrderId?: string, completionId?: string | null) {
  return useQuery({
    queryKey: ['attempt-evidence', workOrderId, completionId],
    enabled: !!workOrderId && !!completionId,
    queryFn: async () => {
      const [{ data: artifacts, error: aErr }, { data: assocs, error: sErr }, { data: demos, error: dErr }] =
        await Promise.all([
          supabase.from('evidence_artifacts').select('*').eq('completion_id', completionId!),
          supabase.from('evidence_artifact_requirements').select('*').eq('completion_id', completionId!),
          supabase.from('task_demonstrations').select('*').eq('completion_id', completionId!),
        ]);
      if (aErr) throw aErr;
      if (sErr) throw sErr;
      if (dErr) throw dErr;
      return {
        artifacts: (artifacts ?? []) as unknown as ArtifactRow[],
        associations: (assocs ?? []) as unknown as AssociationRow[],
        demonstrations: (demos ?? []) as unknown as DemonstrationRow[],
      };
    },
  });
}

export function useSignedEvidenceUrl() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await supabase.storage.from('evidence').createSignedUrl(storagePath, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

type SubmitArgs = {
  workOrderId: string;
  completionId: string;
  taskId: string;
  requirementId: string;
  /** when replacing evidence that needs revision */
  supersedesAssociationId?: string;
  title?: string;
  file?: File;
  bodyText?: string;
  bodyStructured?: Record<string, unknown>;
  learnerRationale?: string;
  timecodeStart?: number | null;
  timecodeEnd?: number | null;
  frameReference?: string | null;
  /** reuse an artifact the learner already submitted instead of uploading again */
  reuseArtifactId?: string;
};

export function useSubmitTaskEvidence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (args: SubmitArgs) => {
      if (!user) throw new Error('Not signed in');

      // make sure the task record exists for this attempt
      await supabase.rpc('ensure_task_demonstration', {
        p_task_id: args.taskId,
        p_completion_id: args.completionId,
      });

      let artifactId = args.reuseArtifactId;

      if (!artifactId) {
        let storagePath: string | null = null;
        if (args.file) {
          const ext = args.file.name.split('.').pop() || 'bin';
          storagePath = `${user.id}/${args.workOrderId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('evidence')
            .upload(storagePath, args.file, { contentType: args.file.type, upsert: false });
          if (upErr) throw upErr;
        }

        const { data: artifact, error: aErr } = await supabase
          .from('evidence_artifacts')
          .insert({
            user_id: user.id,
            work_order_id: args.workOrderId,
            completion_id: args.completionId,
            artifact_kind: args.file ? 'file' : 'text',
            storage_path: storagePath,
            mime_type: args.file?.type ?? null,
            file_size: args.file?.size ?? null,
            body_text: args.bodyText ?? null,
            body_structured: (args.bodyStructured ?? null) as never,
            title: args.title ?? args.file?.name ?? (args.bodyStructured ? 'Structured response' : 'Written response'),
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (aErr) throw aErr;
        artifactId = artifact.id;
      }

      if (args.supersedesAssociationId) {
        const { error: deErr } = await supabase
          .from('evidence_artifact_requirements')
          .update({ is_active: false })
          .eq('id', args.supersedesAssociationId);
        if (deErr) throw deErr;
      }

      const { error: asErr } = await supabase.from('evidence_artifact_requirements').insert({
        artifact_id: artifactId!,
        requirement_id: args.requirementId,
        completion_id: args.completionId,
        user_id: user.id,
        learner_rationale: args.learnerRationale ?? null,
        timecode_start_seconds: args.timecodeStart ?? null,
        timecode_end_seconds: args.timecodeEnd ?? null,
        frame_reference: args.frameReference ?? null,
      });
      if (asErr) throw asErr;
      return artifactId!;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['attempt-evidence', vars.workOrderId, vars.completionId] });
    },
  });
}
