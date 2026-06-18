ALTER TABLE public.simulations
  DROP CONSTRAINT simulations_sim_type_check,
  ADD CONSTRAINT simulations_sim_type_check
    CHECK (sim_type IN ('sequence', 'loadout', 'resource_selection', 'method_selection'));

ALTER TABLE public.simulation_runs
  DROP CONSTRAINT simulation_runs_archetype_check,
  ADD CONSTRAINT simulation_runs_archetype_check
    CHECK (archetype IN ('sequence', 'loadout', 'resource_selection', 'method_selection'));