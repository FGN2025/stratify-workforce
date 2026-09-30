CREATE UNIQUE INDEX IF NOT EXISTS skill_credentials_source_ref_unique
  ON public.skill_credentials (passport_id, external_reference_id, credential_type_key)
  WHERE external_reference_id IS NOT NULL AND credential_type_key IS NOT NULL;