-- =============================================
-- LEARNING MANAGEMENT SYSTEM DATABASE SCHEMA
-- =============================================

-- Enums for LMS
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.lesson_type AS ENUM ('video', 'reading', 'quiz', 'simulation', 'work_order');
CREATE TYPE public.progress_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');
CREATE TYPE public.points_type AS ENUM ('xp', 'credits', 'tokens');
CREATE TYPE public.source_type AS ENUM ('lesson', 'module', 'course', 'achievement', 'bonus', 'redemption');
CREATE TYPE public.achievement_category AS ENUM ('mastery', 'streak', 'social', 'special');
CREATE TYPE public.achievement_trigger AS ENUM ('points', 'lessons', 'courses', 'time', 'score', 'streak');
CREATE TYPE public.achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
CREATE TYPE public.credential_type AS ENUM ('course_completion', 'certification', 'badge', 'skill_verification');

-- =============================================
-- 1. COURSES TABLE
-- =============================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  difficulty_level difficulty_level NOT NULL DEFAULT 'beginner',
  estimated_hours INTEGER DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses are viewable by everyone"
  ON public.courses FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all courses"
  ON public.courses FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert courses"
  ON public.courses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update courses"
  ON public.courses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. MODULES TABLE
-- =============================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules of published courses are viewable by everyone"
  ON public.modules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = modules.course_id AND courses.is_published = true
  ));

CREATE POLICY "Admins can view all modules"
  ON public.modules FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert modules"
  ON public.modules FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modules"
  ON public.modules FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete modules"
  ON public.modules FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. LESSONS TABLE
-- =============================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lesson_type lesson_type NOT NULL DEFAULT 'reading',
  content JSONB DEFAULT '{}'::jsonb,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  duration_minutes INTEGER DEFAULT 10,
  xp_reward INTEGER NOT NULL DEFAULT 25,
  order_index INTEGER NOT NULL DEFAULT 0,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lessons of published courses are viewable by everyone"
  ON public.lessons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.modules
    JOIN public.courses ON courses.id = modules.course_id
    WHERE modules.id = lessons.module_id AND courses.is_published = true
  ));

CREATE POLICY "Admins can view all lessons"
  ON public.lessons FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lessons"
  ON public.lessons FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lessons"
  ON public.lessons FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. USER COURSE ENROLLMENTS TABLE
-- =============================================
CREATE TABLE public.user_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  current_module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  current_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  UNIQUE(user_id, course_id)
);

ALTER TABLE public.user_course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments"
  ON public.user_course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
  ON public.user_course_enrollments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can enroll themselves"
  ON public.user_course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON public.user_course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- 5. USER LESSON PROGRESS TABLE
-- =============================================
CREATE TABLE public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status progress_status NOT NULL DEFAULT 'not_started',
  score NUMERIC,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_lesson_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own progress"
  ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_lesson_progress_updated_at
  BEFORE UPDATE ON public.user_lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. USER POINTS TABLE (XP Ledger)
-- =============================================
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points_type points_type NOT NULL DEFAULT 'xp',
  amount INTEGER NOT NULL,
  source_type source_type NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON public.user_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points"
  ON public.user_points FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert points for authenticated users"
  ON public.user_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for quick XP totals
CREATE INDEX idx_user_points_user_type ON public.user_points(user_id, points_type);

-- =============================================
-- 7. ACHIEVEMENTS TABLE
-- =============================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'trophy',
  category achievement_category NOT NULL DEFAULT 'mastery',
  trigger_type achievement_trigger NOT NULL,
  trigger_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  rarity achievement_rarity NOT NULL DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all achievements"
  ON public.achievements FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update achievements"
  ON public.achievements FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete achievements"
  ON public.achievements FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- 8. USER ACHIEVEMENTS TABLE
-- =============================================
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view all earned achievements"
  ON public.user_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can award achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 9. SKILL PASSPORT TABLE
-- =============================================
CREATE TABLE public.skill_passport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  passport_hash TEXT NOT NULL,
  public_url_slug TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_passport ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own passport"
  ON public.skill_passport FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public passports are viewable by everyone"
  ON public.skill_passport FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create their own passport"
  ON public.skill_passport FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own passport"
  ON public.skill_passport FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_skill_passport_updated_at
  BEFORE UPDATE ON public.skill_passport
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 10. SKILL CREDENTIALS TABLE
-- =============================================
CREATE TABLE public.skill_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_id UUID NOT NULL REFERENCES public.skill_passport(id) ON DELETE CASCADE,
  credential_type credential_type NOT NULL,
  title TEXT NOT NULL,
  issuer TEXT,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  skills_verified TEXT[] DEFAULT '{}',
  score NUMERIC,
  verification_hash TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credentials"
  ON public.skill_credentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.skill_passport 
    WHERE skill_passport.id = skill_credentials.passport_id 
    AND skill_passport.user_id = auth.uid()
  ));

CREATE POLICY "Public credentials are viewable"
  ON public.skill_credentials FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.skill_passport 
    WHERE skill_passport.id = skill_credentials.passport_id 
    AND skill_passport.is_public = true
  ));

CREATE POLICY "Users can add credentials to their passport"
  ON public.skill_credentials FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.skill_passport 
    WHERE skill_passport.id = skill_credentials.passport_id 
    AND skill_passport.user_id = auth.uid()
  ));

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get total XP for a user
CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.user_points
  WHERE user_id = p_user_id AND points_type = 'xp';
$$;

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION public.get_user_level(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN get_user_total_xp(p_user_id) >= 10000 THEN 10
    WHEN get_user_total_xp(p_user_id) >= 7500 THEN 9
    WHEN get_user_total_xp(p_user_id) >= 5000 THEN 8
    WHEN get_user_total_xp(p_user_id) >= 3500 THEN 7
    WHEN get_user_total_xp(p_user_id) >= 2500 THEN 6
    WHEN get_user_total_xp(p_user_id) >= 1500 THEN 5
    WHEN get_user_total_xp(p_user_id) >= 1000 THEN 4
    WHEN get_user_total_xp(p_user_id) >= 500 THEN 3
    WHEN get_user_total_xp(p_user_id) >= 200 THEN 2
    ELSE 1
  END;
$$;

-- Function to get course progress percentage
CREATE OR REPLACE FUNCTION public.get_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN total_lessons = 0 THEN 0
    ELSE (completed_lessons * 100 / total_lessons)::INTEGER
  END
  FROM (
    SELECT 
      COUNT(l.id) as total_lessons,
      COUNT(ulp.id) FILTER (WHERE ulp.status = 'completed') as completed_lessons
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.user_lesson_progress ulp ON ulp.lesson_id = l.id AND ulp.user_id = p_user_id
    WHERE m.course_id = p_course_id
  ) counts;
$$;

-- =============================================
-- SEED SAMPLE ACHIEVEMENTS
-- =============================================
INSERT INTO public.achievements (name, description, icon_name, category, trigger_type, trigger_value, xp_reward, rarity) VALUES
  ('First Steps', 'Complete your first lesson', 'footprints', 'mastery', 'lessons', '{"count": 1}', 25, 'common'),
  ('Quick Learner', 'Complete 5 lessons', 'zap', 'mastery', 'lessons', '{"count": 5}', 50, 'common'),
  ('Dedicated Student', 'Complete 25 lessons', 'book-open', 'mastery', 'lessons', '{"count": 25}', 150, 'rare'),
  ('Knowledge Seeker', 'Complete your first course', 'graduation-cap', 'mastery', 'courses', '{"count": 1}', 200, 'rare'),
  ('Perfectionist', 'Score 100% on any quiz', 'target', 'mastery', 'score', '{"min_score": 100}', 100, 'rare'),
  ('Consistent Learner', 'Maintain a 7-day learning streak', 'flame', 'streak', 'streak', '{"days": 7}', 150, 'rare'),
  ('Marathon Learner', 'Maintain a 30-day learning streak', 'calendar', 'streak', 'streak', '{"days": 30}', 500, 'epic'),
  ('XP Hunter', 'Earn 1000 XP', 'star', 'mastery', 'points', '{"amount": 1000}', 100, 'common'),
  ('XP Master', 'Earn 5000 XP', 'award', 'mastery', 'points', '{"amount": 5000}', 300, 'epic'),
  ('Legendary Learner', 'Earn 10000 XP', 'crown', 'mastery', 'points', '{"amount": 10000}', 500, 'legendary');