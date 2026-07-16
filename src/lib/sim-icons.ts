import { Truck, Tractor, HardHat, Wrench, Cable, Map as MapIcon, Target, GraduationCap, Briefcase, Trophy, Award, Zap, BookOpen, Gamepad2, Home, Plane, type LucideIcon } from 'lucide-react';

export const ICON_OPTIONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'truck', label: 'Truck', icon: Truck },
  { key: 'tractor', label: 'Tractor', icon: Tractor },
  { key: 'hard-hat', label: 'Hard Hat', icon: HardHat },
  { key: 'wrench', label: 'Wrench', icon: Wrench },
  { key: 'cable', label: 'Cable', icon: Cable },
  { key: 'map', label: 'Map', icon: MapIcon },
  { key: 'target', label: 'Target', icon: Target },
  { key: 'graduation-cap', label: 'Graduation', icon: GraduationCap },
  { key: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { key: 'trophy', label: 'Trophy', icon: Trophy },
  { key: 'award', label: 'Award', icon: Award },
  { key: 'zap', label: 'Zap', icon: Zap },
  { key: 'book-open', label: 'Book', icon: BookOpen },
  { key: 'gamepad', label: 'Gamepad', icon: Gamepad2 },
  { key: 'home', label: 'Home', icon: Home },
  { key: 'plane', label: 'Plane', icon: Plane },
];

const map = Object.fromEntries(ICON_OPTIONS.map((o) => [o.key, o.icon]));

export function getIconByKey(key: string | null | undefined): LucideIcon {
  return (key && map[key]) || Target;
}
