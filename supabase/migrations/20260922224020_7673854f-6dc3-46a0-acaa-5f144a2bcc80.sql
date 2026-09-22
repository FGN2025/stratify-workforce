ALTER TABLE public.simulation_activity_reconciliation
  DROP CONSTRAINT simulation_activity_reconciliation_status_chk;

ALTER TABLE public.simulation_activity_reconciliation
  ADD CONSTRAINT simulation_activity_reconciliation_status_chk
  CHECK (status = ANY (ARRAY[
    'MATCHED'::text,
    'ACCEPTED_MULTI_INTERPRETATION'::text,
    'ACADEMY_NATIVE'::text,
    'NEEDS_REVIEW'::text,
    'LEGACY_SOURCE'::text,
    'ORPHANED_SOURCE'::text,
    'RETIRED'::text
  ]));