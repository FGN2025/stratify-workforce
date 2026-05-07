-- ============================================================
-- Migration #1: Phase 2 v0.3 — SCORM session completion schema
-- ============================================================

-- 1. skill_credentials enrichment (additive, all nullable)
ALTER TABLE public.skill_credentials
  ADD COLUMN IF NOT EXISTS course_id        uuid REFERENCES public.scorm_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id        uuid,
  ADD COLUMN IF NOT EXISTS lesson_id        uuid,
  ADD COLUMN IF NOT EXISTS source           text,
  ADD COLUMN IF NOT EXISTS xp_earned        integer,
  ADD COLUMN IF NOT EXISTS attempts         integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Note: skill_credentials.course_id, module_id, lesson_id, xp_earned already
-- exist per the current schema dump. IF NOT EXISTS makes this safe to re-run.

-- Partial unique index: one SCORM-session credential per (passport, course)
CREATE UNIQUE INDEX IF NOT EXISTS skill_credentials_scorm_session_unique
  ON public.skill_credentials (passport_id, course_id)
  WHERE source = 'scorm_session';

-- 2. scorm_course_progress — extend in place (table already exists with
--    surrogate id PK; we add missing columns, constraints, and a UNIQUE
--    target for upserts instead of swapping the PK).

ALTER TABLE public.scorm_course_progress
  ADD COLUMN IF NOT EXISTS score_raw          numeric,
  ADD COLUMN IF NOT EXISTS total_time_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_session_id    uuid;

-- score_raw range check (0..100). Use NOT VALID + VALIDATE to be safe with
-- any pre-existing rows; numeric check is immutable so this is fine.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scorm_course_progress_score_raw_range'
  ) THEN
    ALTER TABLE public.scorm_course_progress
      ADD CONSTRAINT scorm_course_progress_score_raw_range
      CHECK (score_raw IS NULL OR (score_raw >= 0 AND score_raw <= 100));
  END IF;
END$$;

-- Backfill lesson_status before tightening
UPDATE public.scorm_course_progress
   SET lesson_status = 'not attempted'
 WHERE lesson_status IS NULL;

ALTER TABLE public.scorm_course_progress
  ALTER COLUMN lesson_status SET DEFAULT 'not attempted',
  ALTER COLUMN lesson_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scorm_course_progress_lesson_status_check'
  ) THEN
    ALTER TABLE public.scorm_course_progress
      ADD CONSTRAINT scorm_course_progress_lesson_status_check
      CHECK (lesson_status IN ('not attempted','incomplete','completed','passed','failed','browsed'));
  END IF;
END$$;

-- Upsert target: one progress row per (user, course)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scorm_course_progress_user_course_unique'
  ) THEN
    ALTER TABLE public.scorm_course_progress
      ADD CONSTRAINT scorm_course_progress_user_course_unique
      UNIQUE (user_id, course_id);
  END IF;
END$$;

-- 3. RLS — drop client-write policies; writes flow only via edge function (service role)
DROP POLICY IF EXISTS "Users insert own scorm progress" ON public.scorm_course_progress;
DROP POLICY IF EXISTS "Users update own scorm progress" ON public.scorm_course_progress;

-- Keep existing SELECT policies (users view own, admins read all). Re-assert
-- admin policy under the spec's name idempotently in case it was renamed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'scorm_course_progress'
      AND policyname = 'admins read all progress'
  ) THEN
    CREATE POLICY "admins read all progress"
      ON public.scorm_course_progress FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END$$;
