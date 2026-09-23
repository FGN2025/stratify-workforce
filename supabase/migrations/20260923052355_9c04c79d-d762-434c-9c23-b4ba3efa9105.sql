
CREATE OR REPLACE FUNCTION public.studio_vocabulary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  v_groups jsonb := '{}'::jsonb;
  v_unsupported jsonb := '[]'::jsonb;
  v_hash text;
  v_vals text[];
  v_src text;

  FUNCTION_PLACEHOLDER boolean;
BEGIN
  -- Enum-backed groups
  SELECT jsonb_object_agg(k, v) INTO v_groups FROM (
    SELECT 'evidenceBases' AS k,
           jsonb_agg(jsonb_build_object('value', e.enumlabel, 'label', initcap(replace(e.enumlabel,'_',' '))) ORDER BY e.enumsortorder) AS v
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'evidence_basis'
    UNION ALL
    SELECT 'assessmentOutcomes',
           jsonb_agg(jsonb_build_object('value', e.enumlabel, 'label', initcap(replace(e.enumlabel,'_',' '))) ORDER BY e.enumsortorder)
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'assessment_outcome'
    UNION ALL
    SELECT 'evidenceTypes',
           jsonb_agg(jsonb_build_object('value', e.enumlabel, 'label', initcap(replace(e.enumlabel,'_',' '))) ORDER BY e.enumsortorder)
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'evidence_type'
    UNION ALL
    SELECT 'evidenceQuality',
           jsonb_agg(jsonb_build_object('value', e.enumlabel, 'label', initcap(replace(e.enumlabel,'_',' '))) ORDER BY e.enumsortorder)
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'evidence_quality'
    UNION ALL
    SELECT 'demonstrationStatuses',
           jsonb_agg(jsonb_build_object('value', e.enumlabel, 'label', initcap(replace(e.enumlabel,'_',' '))) ORDER BY e.enumsortorder)
    FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'demonstration_status'
  ) s WHERE v IS NOT NULL;

  IF v_groups IS NULL THEN v_groups := '{}'::jsonb; END IF;

  -- Check-constraint backed groups: parsed only when the expression is a clean
  -- ANY (ARRAY[...]) / IN (...) list. Anything else is reported unsupported.
  -- artifact kinds
  SELECT pg_get_constraintdef(c.oid) INTO v_src
  FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
  WHERE r.relname = 'evidence_artifacts' AND c.conname = 'ea_kind_chk';

  IF v_src IS NOT NULL AND v_src ~ '''[a-z_]+''' THEN
    SELECT array_agg(DISTINCT m[1]) INTO v_vals
    FROM regexp_matches(v_src, '''([a-z_]+)''', 'g') m;
    v_groups := v_groups || jsonb_build_object('artifactKinds',
      (SELECT jsonb_agg(jsonb_build_object('value', x, 'label', initcap(replace(x,'_',' ')))) FROM unnest(v_vals) x));
  ELSE
    v_unsupported := v_unsupported || jsonb_build_object('group','artifactKinds','reason','constraint expression is not a parseable enumeration');
  END IF;

  -- signal strengths
  SELECT pg_get_constraintdef(c.oid) INTO v_src
  FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
  WHERE r.relname = 'task_skill_mappings' AND c.conname = 'tsm_strength_chk';

  IF v_src IS NOT NULL AND v_src ~ '''[a-z_]+''' THEN
    SELECT array_agg(DISTINCT m[1]) INTO v_vals
    FROM regexp_matches(v_src, '''([a-z_]+)''', 'g') m;
    v_groups := v_groups || jsonb_build_object('signalStrengths',
      (SELECT jsonb_agg(jsonb_build_object('value', x, 'label', initcap(x))) FROM unnest(v_vals) x));
  ELSE
    v_unsupported := v_unsupported || jsonb_build_object('group','signalStrengths','reason','constraint expression is not a parseable enumeration');
  END IF;

  -- fixed, Academy-owned vocabularies
  v_groups := v_groups || jsonb_build_object(
    'maturityStates', jsonb_build_array(
      jsonb_build_object('value','unclassified','label','Unclassified'),
      jsonb_build_object('value','level_1','label','Level 1 — canonically connected'),
      jsonb_build_object('value','level_2','label','Level 2 — skills mapped'),
      jsonb_build_object('value','level_3','label','Level 3 — evidence validated')),
    'signalStrengthSchemes', jsonb_build_array(
      jsonb_build_object('value','v1_three_band','label','v1 three band'),
      jsonb_build_object('value','v2_fit_weighted','label','v2 fit weighted')),
    'curationStates', jsonb_build_array(
      jsonb_build_object('value','active','label','Active'),
      jsonb_build_object('value','needs_review','label','Needs review'),
      jsonb_build_object('value','retired','label','Retired'))
  );

  v_hash := md5(v_groups::text);

  RETURN jsonb_build_object(
    'vocabulary_version', v_hash,
    'groups', v_groups,
    'unsupported', v_unsupported
  );
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.studio_vocabulary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_vocabulary() TO service_role;
