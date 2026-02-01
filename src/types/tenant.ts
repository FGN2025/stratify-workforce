export interface Tenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string | null;
  username: string | null;
  avatar_url: string | null;
  employability_score: number;
  skills: SkillSet;
  created_at: string;
  updated_at: string;
}

export interface SkillSet {
  safety: number;
  efficiency: number;
  precision: number;
  speed: number;
  equipment_care: number;
}

export type GameTitle = 'ATS' | 'Farming_Sim' | 'Construction_Sim' | 'Mechanic_Sim';

export interface WorkOrder {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  game_title: GameTitle;
  success_criteria: Record<string, number>;
  is_active: boolean;
  created_at: string;
  tenant?: Tenant;
}

export interface TelemetrySession {
  id: string;
  user_id: string;
  work_order_id: string | null;
  started_at: string;
  completed_at: string | null;
  final_score: number | null;
  raw_data: Record<string, unknown>;
}

export interface ActiveStudent {
  id: string;
  username: string;
  avatar_url: string | null;
  current_job: string;
  game_title: GameTitle;
  live_speed: number;
  live_rpm: number;
  status: 'active' | 'idle' | 'completed';
}
