-- Add cover_image_url column to work_orders table
ALTER TABLE work_orders
ADD COLUMN cover_image_url text;

COMMENT ON COLUMN work_orders.cover_image_url IS 
  'Optional custom cover image URL. Falls back to game-type cover if null.';