// Types mirror @fgn/course-types from fgn-scorm-toolkit.
// Vendored at v0 — kept in sync manually until npm publish.

export type Pillar = 'perf' | 'play' | 'path' | 'fiber';

export interface ChallengeTask {
  id: string;
  position: number;
  title: string;
  description: string;
  evidenceSpec: string;
  mechanicType: 'in-game' | 'annotation';
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: 'single-choice' | 'multi-choice' | 'true-false';
  choices: { id: string; label: string; correct: boolean }[];
  explanation?: string;
}

export interface BaseModule {
  id: string;
  position: number;
  title: string;
}

export type CourseModule =
  | (BaseModule & { type: 'briefing'; html: string })
  | (BaseModule & {
      type: 'challenge';
      challengeId: string;
      challengeUrl: string;
      tasks: ChallengeTask[];
      preLaunchHtml?: string;
    })
  | (BaseModule & { type: 'quiz'; passThreshold: number; questions: QuizQuestion[] })
  | (BaseModule & { type: 'media'; mediaUrl: string; caption?: string; posterUrl?: string })
  | (BaseModule & { type: 'completion'; html: string });

export interface CourseManifest {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  scormVersion: '1.2' | 'cmi5';
  pillar?: Pillar;
  coverImageUrl?: string;
  coverImageRemoteUrl?: string;
  gatingChallengeId?: string;
  modules: CourseModule[];
}

export interface ProgressState {
  currentModuleId: string | null;
  completedModuleIds: string[];
  quizScores: Record<string, { score: number; passed: boolean }>;
  finalScore?: number;
  status: 'in_progress' | 'passed' | 'failed' | 'incomplete';
}
