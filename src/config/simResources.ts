// Simulation Resources Configuration
// Scalable architecture for all simulator game external resources

import { Truck, Tractor, HardHat, Wrench, Cable, GraduationCap, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GameTitle } from '@/types/tenant';

export interface SimResource {
  key: string;
  title: string;
  description: string;
  href: string;
  accentColor: string;
  icon: LucideIcon;
}

export interface SimGameConfig {
  title: string;
  shortTitle: string;
  icon: LucideIcon;
  accentColor: string;
  resources: SimResource[];
}

export type SimResourcesConfig = Record<GameTitle, SimGameConfig>;

export const SIM_RESOURCES: SimResourcesConfig = {
  ATS: {
    title: 'American Truck Sim',
    shortTitle: 'ATS',
    icon: Truck,
    accentColor: '#3B82F6',
    resources: [
      {
        key: 'cdlQuest',
        title: 'CDL Quest',
        description: 'Complete CDL curriculum with structured learning paths and telemetry tracking',
        href: 'https://simu-cdl-path.lovable.app',
        accentColor: '#3B82F6',
        icon: GraduationCap,
      },
      {
        key: 'cdlExchange',
        title: 'CDL Exchange',
        description: 'Verified credentials marketplace for employers and recruiters',
        href: 'https://skill-truck-path.lovable.app',
        accentColor: '#10B981',
        icon: Briefcase,
      },
    ],
  },
  Farming_Sim: {
    title: 'Farming Simulator',
    shortTitle: 'Farming',
    icon: Tractor,
    accentColor: '#22C55E',
    resources: [], // Coming Soon
  },
  Construction_Sim: {
    title: 'Construction Simulator',
    shortTitle: 'Construction',
    icon: HardHat,
    accentColor: '#F59E0B',
    resources: [], // Coming Soon
  },
  Mechanic_Sim: {
    title: 'Mechanic Simulator',
    shortTitle: 'Mechanic',
    icon: Wrench,
    accentColor: '#EF4444',
    resources: [], // Coming Soon
  },
  Fiber_Tech: {
    title: 'Fiber-Tech Simulator',
    shortTitle: 'Fiber-Tech',
    icon: Cable,
    accentColor: '#8B5CF6',
    resources: [], // Admin-managed via database
  },
};

// Helper to get resources for a specific game
export function getGameResources(game: GameTitle): SimResource[] {
  return SIM_RESOURCES[game]?.resources || [];
}

// Helper to check if a game has resources
export function hasResources(game: GameTitle): boolean {
  return getGameResources(game).length > 0;
}

// Legacy export for backward compatibility
export const ATS_RESOURCES = {
  cdlQuest: SIM_RESOURCES.ATS.resources.find(r => r.key === 'cdlQuest')!,
  cdlExchange: SIM_RESOURCES.ATS.resources.find(r => r.key === 'cdlExchange')!,
} as const;

export type ATSResourceKey = keyof typeof ATS_RESOURCES;
