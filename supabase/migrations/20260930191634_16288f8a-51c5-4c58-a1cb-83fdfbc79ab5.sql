ALTER TABLE public.play_replay_queue DROP CONSTRAINT play_replay_queue_reason_check;
ALTER TABLE public.play_replay_queue ADD CONSTRAINT play_replay_queue_reason_check
  CHECK (reason IN ('unmapped_identity','unmapped_challenge','manual','identity_linked'));