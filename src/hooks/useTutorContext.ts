import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useProfile } from './useProfile';
import type { TutorPageContext, TutorUserContext, TutorContextType } from '@/types/tutor';

// XP thresholds for levels
const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, name: 'Rookie' },
  { level: 2, minXp: 100, name: 'Apprentice' },
  { level: 3, minXp: 300, name: 'Practitioner' },
  { level: 4, minXp: 600, name: 'Specialist' },
  { level: 5, minXp: 1000, name: 'Expert' },
  { level: 6, minXp: 1500, name: 'Master' },
  { level: 7, minXp: 2500, name: 'Virtuoso' },
  { level: 8, minXp: 4000, name: 'Legend' },
];

function getLevelFromXP(xp: number): { level: number; name: string } {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXp) {
      return { level: LEVEL_THRESHOLDS[i].level, name: LEVEL_THRESHOLDS[i].name };
    }
  }
  return { level: 1, name: 'Rookie' };
}

export function useTutorContext() {
  const location = useLocation();
  const params = useParams();
  const { profile, stats } = useProfile();

  const pageContext = useMemo((): TutorPageContext => {
    const pathname = location.pathname;

    // Work order detail page
    if (pathname.startsWith('/work-orders/') && params.id) {
      return {
        type: 'work_order',
        id: params.id,
        title: 'Work Order',
      };
    }

    // Work orders list
    if (pathname === '/work-orders') {
      return {
        type: 'general',
        title: 'Work Orders',
      };
    }

    // Course/Learn pages
    if (pathname.startsWith('/learn')) {
      return {
        type: 'course',
        title: 'Learning',
      };
    }

    // Events
    if (pathname.startsWith('/events')) {
      return {
        type: 'general',
        title: 'Events',
      };
    }

    // Profile
    if (pathname.startsWith('/profile')) {
      return {
        type: 'general',
        title: 'Profile',
      };
    }

    // Leaderboard
    if (pathname === '/leaderboard') {
      return {
        type: 'general',
        title: 'Leaderboard',
      };
    }

    // Settings (could be onboarding context if profile incomplete)
    if (pathname === '/settings') {
      return {
        type: 'onboarding',
        title: 'Settings',
      };
    }

    // Communities
    if (pathname.startsWith('/communit')) {
      return {
        type: 'general',
        title: 'Communities',
      };
    }

    // Default general context
    return {
      type: 'general',
      title: 'Dashboard',
    };
  }, [location.pathname, params]);

  const userContext = useMemo((): TutorUserContext => {
    const totalXp = stats?.totalXp || 0;
    const levelInfo = getLevelFromXP(totalXp);

    return {
      xp: totalXp,
      level: levelInfo.level,
      levelName: levelInfo.name,
      enrolledCourses: [], // Would come from useCourses hook if needed
      activeGames: [], // Would come from game stats if needed
    };
  }, [stats]);

  return {
    pageContext,
    userContext,
    // Combined context for API calls
    apiContext: {
      type: pageContext.type,
      id: pageContext.id,
      gameTitle: pageContext.gameTitle,
      title: pageContext.title,
      userXp: userContext.xp,
      userLevel: userContext.level,
    },
  };
}
