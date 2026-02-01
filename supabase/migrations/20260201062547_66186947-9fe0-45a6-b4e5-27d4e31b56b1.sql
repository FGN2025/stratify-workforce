-- Add work_order to source_type enum
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'work_order';

-- Create work order difficulty enum
DO $$ BEGIN
  CREATE TYPE public.work_order_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create work order completion status enum
DO $$ BEGIN
  CREATE TYPE public.completion_status AS ENUM ('in_progress', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS xp_reward integer NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES public.game_channels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS difficulty public.work_order_difficulty NOT NULL DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS estimated_time_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT NULL;

-- Create user_work_order_completions table
CREATE TABLE IF NOT EXISTS public.user_work_order_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  status public.completion_status NOT NULL DEFAULT 'in_progress',
  score numeric,
  xp_awarded integer DEFAULT 0,
  attempt_number integer NOT NULL DEFAULT 1,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_work_order_attempt UNIQUE (user_id, work_order_id, attempt_number)
);

-- Enable RLS on user_work_order_completions
ALTER TABLE public.user_work_order_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_work_order_completions
CREATE POLICY "Users can view their own completions"
  ON public.user_work_order_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.user_work_order_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
  ON public.user_work_order_completions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all completions"
  ON public.user_work_order_completions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_work_order_completions_user 
  ON public.user_work_order_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_order_completions_work_order 
  ON public.user_work_order_completions(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_channel 
  ON public.work_orders(channel_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_game_title 
  ON public.work_orders(game_title);

-- Update existing work orders with default XP based on difficulty
UPDATE public.work_orders 
SET xp_reward = 50, difficulty = 'beginner' 
WHERE xp_reward IS NULL OR xp_reward = 0;

-- Link work orders to game channels based on game_title
UPDATE public.work_orders wo
SET channel_id = gc.id
FROM public.game_channels gc
WHERE wo.game_title = gc.game_title AND wo.channel_id IS NULL;