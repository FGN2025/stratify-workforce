import { Card, CardContent } from '@/components/ui/card';
import { 
  Trophy, 
  Zap, 
  Shield, 
  Star, 
  Target,
  Award,
  Flame,
  Users
} from 'lucide-react';
import type { UserAchievement } from '@/hooks/useProfile';

const iconMap: Record<string, typeof Trophy> = {
  trophy: Trophy,
  zap: Zap,
  shield: Shield,
  star: Star,
  target: Target,
  award: Award,
  flame: Flame,
  users: Users,
};

const rarityColors: Record<string, string> = {
  common: 'text-muted-foreground',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-500',
};

interface AchievementCardProps {
  achievement: UserAchievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const Icon = iconMap[achievement.achievement.icon_name] || Trophy;
  const colorClass = rarityColors[achievement.achievement.rarity] || 'text-primary';

  return (
    <Card className="glass-card min-w-[200px] hover:border-primary/50 transition-all">
      <CardContent className="p-4">
        <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="font-semibold text-sm">{achievement.achievement.name}</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {achievement.achievement.description || `Earned ${new Date(achievement.earned_at).toLocaleDateString()}`}
        </p>
      </CardContent>
    </Card>
  );
}
