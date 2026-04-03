ALTER TABLE public.user_work_order_completions
  ADD CONSTRAINT uq_user_work_order
  UNIQUE (user_id, work_order_id);