// Edge-function-safe mirror of src/config/simResources.ts limited to the
// fields game_channels needs (name + accent_color, keyed by game_title).
// Deno can't import the frontend file because it pulls in lucide-react icons.
// Keep this in sync when adding a new GameTitle to the enum.

export type GameTitle =
  | 'ATS'
  | 'Farming_Sim'
  | 'Construction_Sim'
  | 'Mechanic_Sim'
  | 'Fiber_Tech'
  | 'Roadcraft'
  | 'MSFS_2024'
  | 'House_Flipper'
  | 'House_Flipper_2'
  | 'Electrician_Sim';

export interface SimChannelConfig {
  name: string;
  accentColor: string;
}

export const SIM_CHANNEL_CONFIG: Record<GameTitle, SimChannelConfig> = {
  ATS:              { name: 'Trucking Simulator',              accentColor: '#8B5CF6' },
  Farming_Sim:      { name: 'Farming Simulator',               accentColor: '#22C55E' },
  Construction_Sim: { name: 'Construction Simulator',          accentColor: '#F59E0B' },
  Mechanic_Sim:     { name: 'Mechanic Simulator',              accentColor: '#EF4444' },
  Fiber_Tech:       { name: 'Fiber-Tech Simulator',            accentColor: '#3B82F6' },
  Roadcraft:        { name: 'Roadcraft',                       accentColor: '#12cabd' },
  MSFS_2024:        { name: 'Microsoft Flight Simulator 2024', accentColor: '#0EA5E9' },
  House_Flipper:    { name: 'House Flipper',                   accentColor: '#EC4899' },
  House_Flipper_2:  { name: 'House Flipper 2',                 accentColor: '#EC4899' },
  Electrician_Sim:  { name: 'Electrician Simulator',           accentColor: '#FACC15' },
};
