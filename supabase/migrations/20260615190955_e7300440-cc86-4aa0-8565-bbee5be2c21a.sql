UPDATE public.work_orders SET estimated_time_minutes = 60  WHERE difficulty = 'beginner';
UPDATE public.work_orders SET estimated_time_minutes = 120 WHERE difficulty = 'intermediate';
UPDATE public.work_orders SET estimated_time_minutes = 240 WHERE difficulty = 'advanced';