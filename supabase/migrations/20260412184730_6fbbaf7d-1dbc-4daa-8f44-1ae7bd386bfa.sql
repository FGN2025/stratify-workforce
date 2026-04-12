
-- Gate Tier 2 modules behind Construction Foundation badge
CREATE POLICY tier2_modules_require_construction_foundation
ON public.modules
FOR SELECT
USING (
  NOT (
    course_id = 'dab09852-eeb2-431f-b2f4-b881c6b4aa7f'
    AND order_index >= 6
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.skill_credentials sc
    JOIN public.skill_passport sp ON sc.passport_id = sp.id
    WHERE sp.user_id = auth.uid()
    AND sc.credential_type = 'badge'
    AND sc.title = 'Construction Foundation'
  )
);

-- Gate Tier 2 lessons behind Construction Foundation badge
CREATE POLICY tier2_lessons_require_construction_foundation
ON public.lessons
FOR SELECT
USING (
  NOT EXISTS (
    SELECT 1
    FROM public.modules m
    WHERE m.id = lessons.module_id
    AND m.course_id = 'dab09852-eeb2-431f-b2f4-b881c6b4aa7f'
    AND m.order_index >= 6
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.skill_credentials sc
    JOIN public.skill_passport sp ON sc.passport_id = sp.id
    WHERE sp.user_id = auth.uid()
    AND sc.credential_type = 'badge'
    AND sc.title = 'Construction Foundation'
  )
);

-- Sequential lesson access function for Tier 2
CREATE OR REPLACE FUNCTION public.can_access_lesson(p_lesson_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_order int;
  v_course_id uuid;
  v_prev_lesson_id uuid;
BEGIN
  SELECT m.order_index, m.course_id
  INTO v_module_order, v_course_id
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  WHERE l.id = p_lesson_id;

  IF v_course_id <> 'dab09852-eeb2-431f-b2f4-b881c6b4aa7f'
     OR v_module_order < 6 THEN
    RETURN true;
  END IF;

  IF v_module_order = 6 THEN
    RETURN EXISTS (
      SELECT 1
      FROM skill_credentials sc
      JOIN skill_passport sp ON sc.passport_id = sp.id
      WHERE sp.user_id = p_user_id
      AND sc.credential_type = 'badge'
      AND sc.title = 'Construction Foundation'
    );
  END IF;

  SELECT l.id INTO v_prev_lesson_id
  FROM lessons l
  JOIN modules m ON l.module_id = m.id
  WHERE m.course_id = 'dab09852-eeb2-431f-b2f4-b881c6b4aa7f'
  AND m.order_index = v_module_order - 1
  LIMIT 1;

  IF v_prev_lesson_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_lesson_progress
    WHERE user_id = p_user_id
    AND lesson_id = v_prev_lesson_id
    AND status = 'completed'
  );
END;
$$;
