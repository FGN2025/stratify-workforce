-- Phase 1: Anchor courses to SIMs
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS game_title public.game_title;
CREATE INDEX IF NOT EXISTS idx_courses_game_title ON public.courses(game_title);

-- Backfill known courses
UPDATE public.courses SET game_title = 'Fiber_Tech'
  WHERE id IN ('dab09852-eeb2-431f-b2f4-b881c6b4aa7f','c639fc10-4534-4779-b685-cffb20289f3f')
  AND game_title IS NULL;

UPDATE public.courses SET game_title = 'Construction_Sim'
  WHERE id = 'e7dd3f43-878a-4ac7-98da-9adb5cfe0f08'
  AND game_title IS NULL;