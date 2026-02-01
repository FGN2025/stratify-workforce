// LMS Type Definitions
// These types mirror the database schema for the Learning Management System

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonType = 'video' | 'reading' | 'quiz' | 'simulation' | 'work_order';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';
export type PointsType = 'xp' | 'credits' | 'tokens';
export type SourceType = 'lesson' | 'module' | 'course' | 'achievement' | 'bonus' | 'redemption';
export type AchievementCategory = 'mastery' | 'streak' | 'social' | 'special';
export type AchievementTrigger = 'points' | 'lessons' | 'courses' | 'time' | 'score' | 'streak';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CredentialType = 'course_completion' | 'certification' | 'badge' | 'skill_verification';

export interface Course {
  id: string;
  tenant_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  difficulty_level: DifficultyLevel;
  estimated_hours: number;
  xp_reward: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  modules?: Module[];
  progress?: number;
  enrolled?: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  xp_reward: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  lesson_type: LessonType;
  content: LessonContent;
  work_order_id: string | null;
  duration_minutes: number;
  xp_reward: number;
  order_index: number;
  passing_score: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  progress?: UserLessonProgress;
}

export interface LessonContent {
  // Video lesson
  video_url?: string;
  // Reading lesson
  body?: string;
  // Quiz lesson
  questions?: QuizQuestion[];
  // Simulation/work_order - uses work_order_id FK
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface UserCourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  current_module_id: string | null;
  current_lesson_id: string | null;
  // Joined fields
  course?: Course;
}

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  score: number | null;
  attempts: number;
  started_at: string | null;
  completed_at: string | null;
  xp_earned: number;
  created_at: string;
  updated_at: string;
}

export interface UserPoints {
  id: string;
  user_id: string;
  points_type: PointsType;
  amount: number;
  source_type: SourceType;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon_name: string;
  category: AchievementCategory;
  trigger_type: AchievementTrigger;
  trigger_value: Record<string, unknown>;
  xp_reward: number;
  rarity: AchievementRarity;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  metadata: Record<string, unknown>;
  // Joined fields
  achievement?: Achievement;
}

export interface SkillPassport {
  id: string;
  user_id: string;
  passport_hash: string;
  public_url_slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  credentials?: SkillCredential[];
}

export interface SkillCredential {
  id: string;
  passport_id: string;
  credential_type: CredentialType;
  title: string;
  issuer: string | null;
  issued_at: string;
  expires_at: string | null;
  skills_verified: string[];
  score: number | null;
  verification_hash: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// XP Level thresholds
export const XP_LEVELS = [
  { level: 1, min_xp: 0, name: 'Novice' },
  { level: 2, min_xp: 200, name: 'Apprentice' },
  { level: 3, min_xp: 500, name: 'Learner' },
  { level: 4, min_xp: 1000, name: 'Practitioner' },
  { level: 5, min_xp: 1500, name: 'Skilled' },
  { level: 6, min_xp: 2500, name: 'Proficient' },
  { level: 7, min_xp: 3500, name: 'Advanced' },
  { level: 8, min_xp: 5000, name: 'Expert' },
  { level: 9, min_xp: 7500, name: 'Master' },
  { level: 10, min_xp: 10000, name: 'Legendary' },
] as const;

export function getLevelFromXP(xp: number): { level: number; name: string; progress: number; nextLevelXP: number } {
  let currentLevelIndex = 0;
  let nextLevelIndex = 1;

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min_xp) {
      currentLevelIndex = i;
      nextLevelIndex = Math.min(i + 1, XP_LEVELS.length - 1);
      break;
    }
  }

  const currentLevel = XP_LEVELS[currentLevelIndex];
  const nextLevel = XP_LEVELS[nextLevelIndex];

  const xpInCurrentLevel = xp - currentLevel.min_xp;
  const xpForNextLevel = nextLevel.min_xp - currentLevel.min_xp;
  const progress = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    progress: Math.min(progress, 100),
    nextLevelXP: nextLevel.min_xp,
  };
}

// Rarity colors for achievements
export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: 'text-muted-foreground',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-500',
};

export const RARITY_BG_COLORS: Record<AchievementRarity, string> = {
  common: 'bg-muted',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-amber-500/10',
};
