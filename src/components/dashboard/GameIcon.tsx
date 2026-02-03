import { Truck, Tractor, HardHat, Wrench, Cable } from 'lucide-react';
import type { GameTitle } from '@/types/tenant';
import { cn } from '@/lib/utils';

interface GameIconProps {
  game: GameTitle;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const gameConfig: Record<GameTitle, { icon: React.ElementType; label: string; color: string }> = {
  ATS: { 
    icon: Truck, 
    label: 'American Truck Simulator',
    color: 'text-blue-400 bg-blue-500/20'
  },
  Farming_Sim: { 
    icon: Tractor, 
    label: 'Farming Simulator',
    color: 'text-green-400 bg-green-500/20'
  },
  Construction_Sim: { 
    icon: HardHat, 
    label: 'Construction Simulator',
    color: 'text-amber-400 bg-amber-500/20'
  },
  Mechanic_Sim: { 
    icon: Wrench, 
    label: 'Mechanic Simulator',
    color: 'text-red-400 bg-red-500/20'
  },
  Fiber_Tech: { 
    icon: Cable, 
    label: 'Fiber-Tech Simulator',
    color: 'text-purple-400 bg-purple-500/20'
  },
};

const sizeStyles = {
  sm: 'h-8 w-8 p-1.5',
  md: 'h-10 w-10 p-2',
  lg: 'h-14 w-14 p-3',
};

export function GameIcon({ game, className, size = 'md' }: GameIconProps) {
  const config = gameConfig[game];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "rounded-lg flex items-center justify-center",
        config.color,
        sizeStyles[size],
        className
      )}
      title={config.label}
    >
      <Icon className="h-full w-full" />
    </div>
  );
}

export function getGameLabel(game: GameTitle): string {
  return gameConfig[game].label;
}
