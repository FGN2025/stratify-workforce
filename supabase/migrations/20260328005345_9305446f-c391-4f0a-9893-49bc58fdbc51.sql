-- Fix security definer view by setting it to invoker security
ALTER VIEW public.ai_model_configs_safe SET (security_invoker = on);