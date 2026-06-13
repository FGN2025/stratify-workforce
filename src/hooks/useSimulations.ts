import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SimulationRow {
  id: string;
  wo_code: string;
  title: string;
  sim_type: 'sequence' | 'loadout';
  blurb: string | null;
  briefing: unknown;
  facts: unknown;
  cats: unknown;
  config: { critFailGrade?: string; critFailLine?: string } | null;
  work_order_id: string;
}

export interface SimulationItemPublic {
  id: string;
  item_key: string;
  cat_key: string | null;
  icon: string | null;
  name: string;
  sub: string | null;
  display_order: number;
}

// Public display columns — answer-key (correct/critical/seq/why) is intentionally omitted
const PUBLIC_ITEM_COLUMNS = 'id, item_key, cat_key, icon, name, sub, display_order';

export function useSimulationsForWorkOrder(workOrderId: string | undefined) {
  return useQuery({
    queryKey: ['simulations-for-work-order', workOrderId],
    enabled: !!workOrderId,
    queryFn: async (): Promise<SimulationRow[]> => {
      const { data, error } = await supabase
        .from('simulations')
        .select('id, wo_code, title, sim_type, blurb, briefing, facts, cats, config, work_order_id')
        .eq('work_order_id', workOrderId!)
        .order('wo_code');
      if (error) throw error;
      return (data ?? []) as SimulationRow[];
    },
  });
}

export function useSimulationDetail(simulationId: string | undefined) {
  return useQuery({
    queryKey: ['simulation-detail', simulationId],
    enabled: !!simulationId,
    queryFn: async () => {
      const [{ data: sim, error: simErr }, { data: items, error: itemsErr }] = await Promise.all([
        supabase
          .from('simulations')
          .select('id, wo_code, title, sim_type, blurb, briefing, facts, cats, config, work_order_id')
          .eq('id', simulationId!)
          .maybeSingle(),
        supabase
          .from('simulation_items')
          .select(PUBLIC_ITEM_COLUMNS)
          .eq('simulation_id', simulationId!)
          .order('display_order'),
      ]);
      if (simErr) throw simErr;
      if (itemsErr) throw itemsErr;
      if (!sim) throw new Error('Simulation not found');
      return {
        sim: sim as SimulationRow,
        items: (items ?? []) as SimulationItemPublic[],
      };
    },
  });
}
