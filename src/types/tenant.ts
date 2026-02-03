export type CommunityApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  brand_color: string;
  logo_url: string | null;
  created_at: string;
  // Hierarchy fields
  parent_tenant_id: string | null;
  hierarchy_level: number;
  category_type: CategoryType | null;
  description: string | null;
  member_count: number;
  is_verified: boolean;
  cover_image_url: string | null;
  location: string | null;
  website_url: string | null;
  owner_id: string | null;
  game_titles: GameTitle[] | null;
  // Approval workflow fields
  approval_status: CommunityApprovalStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  // For tree display
  children?: Tenant[];
  parent?: Tenant;
}

export type CategoryType = 
  | 'geography' 
  | 'broadband_provider' 
  | 'trade_skill'
  | 'school'
  | 'employer'
  | 'training_center'
  | 'government'
  | 'nonprofit';

export type MembershipRole = 
  | 'member' 
  | 'moderator' 
  | 'admin'
  | 'student'
  | 'employee'
  | 'apprentice'
  | 'instructor'
  | 'manager'
  | 'subscriber'
  | 'owner';

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
  cover_image_url: string | null;
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

// Category display helpers - prioritized order
export const CATEGORY_LABELS: Record<CategoryType, string> = {
  trade_skill: 'Game Community',
  employer: 'Employer',
  broadband_provider: 'Broadband Provider',
  school: 'School',
  training_center: 'Training Center',
  geography: 'Geographic Region',
  government: 'Government',
  nonprofit: 'Nonprofit',
};

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  member: 'Member',
  moderator: 'Moderator',
  admin: 'Admin',
  student: 'Student',
  employee: 'Employee',
  apprentice: 'Apprentice',
  instructor: 'Instructor',
  manager: 'Manager',
  subscriber: 'Subscriber',
  owner: 'Owner',
};
