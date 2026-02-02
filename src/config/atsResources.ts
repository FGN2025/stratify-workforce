// ATS Subsite Configuration
// These external resources are part of the FGN ecosystem

export const ATS_RESOURCES = {
  cdlQuest: {
    title: 'CDL Quest',
    description: 'Complete CDL curriculum with structured learning paths and telemetry tracking',
    href: 'https://simu-cdl-path.lovable.app',
    accentColor: '#3B82F6', // Blue
  },
  cdlExchange: {
    title: 'CDL Exchange',
    description: 'Verified credentials marketplace for employers and recruiters',
    href: 'https://skill-truck-path.lovable.app',
    accentColor: '#10B981', // Emerald
  },
} as const;

export type ATSResourceKey = keyof typeof ATS_RESOURCES;
