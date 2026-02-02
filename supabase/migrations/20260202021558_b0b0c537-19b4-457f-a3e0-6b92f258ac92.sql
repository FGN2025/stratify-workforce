-- Add winner_id column to events table for storing tournament champion
ALTER TABLE public.events
ADD COLUMN winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.events.winner_id IS 'User ID of the tournament winner (for head_to_head events)';