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

export type GameTitle =
  | 'ATS'
  | 'Farming_Sim'
  | 'Construction_Sim'
  | 'Mechanic_Sim'
  | 'Roadcraft'
  | 'Fiber_Tech';

export type CourseModule =
  | (BaseModule & { type: 'briefing'; html: string })
  | (BaseModule & {
      type: 'challenge';
      challengeId: string;
      challengeUrl: string;
      game?: GameTitle;
      credentialFramework?: string;
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

/** SCORM 1.2 lesson_status valid values. */
export type ScormLessonStatus =
  | 'passed'
  | 'completed'
  | 'failed'
  | 'incomplete'
  | 'browsed'
  | 'not attempted';

export interface ProgressState {
  currentModuleId: string | null;
  completedModuleIds: string[];
  quizScores: Record<string, { score: number; passed: boolean }>;
  finalScore?: number;
  status: 'in_progress' | 'passed' | 'failed' | 'incomplete';

  // v0.3 contract fields (added 2026-05-06 for scorm-session-complete coordination).
  // The host's useFgnAcademyProgress hook consumes these and maps to the
  // snake_case wire format Lovable expects: session_id, session_time_seconds,
  // lesson_status, lesson_location, score_raw, passing_threshold, passed,
  // scorm_suspend_data.
  /** Client-generated UUID v4, stable per Player mount. */
  sessionId: string;
  /** Monotonic seconds since Player mount. */
  sessionTimeSeconds: number;
  /** SCORM 1.2 cmi.core.lesson_status. */
  lessonStatus: ScormLessonStatus;
  /** SCORM 1.2 cmi.core.lesson_location. */
  lessonLocation: string | null;
  /** Quiz score 0-100; null when no quiz module in the course. */
  scoreRaw: number | null;
  /** Quiz passThreshold; null when no quiz module. */
  passingThreshold: number | null;
  /** scoreRaw >= passingThreshold, or true if no quiz. */
  passed: boolean;
  /** Serialized ScormSuspendDataV1 JSON, <= 4096 bytes. */
  scormSuspendData: string;
}

/** Suspend-data envelope (position-keyed for density + regen-survival). */
export interface ScormSuspendDataV1 {
  v: 1;
  currentPosition: number;
  completedPositions: number[];
  quizScores: Record<string, { score: number; passed: boolean }>;
}
