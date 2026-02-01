import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Trophy, Gamepad2 } from 'lucide-react';

interface AdminStatsGridProps {
  averageScore: number;
  sessionsThisWeek: number;
  topGame: string;
  newUsersThisWeek: number;
  isLoading?: boolean;
}

export function AdminStatsGrid({
  averageScore,
  sessionsThisWeek,
  topGame,
  newUsersThisWeek,
  isLoading,
}: AdminStatsGridProps) {
  const stats = [
    {
      title: 'Avg. Employability Score',
      value: isLoading ? '—' : averageScore.toFixed(1),
      icon: Trophy,
      description: 'Across all users',
      color: 'text-amber-500',
    },
    {
      title: 'Sessions This Week',
      value: isLoading ? '—' : sessionsThisWeek.toString(),
      icon: TrendingUp,
      description: 'Training sessions completed',
      color: 'text-emerald-500',
    },
    {
      title: 'Most Popular Channel',
      value: isLoading ? '—' : topGame,
      icon: Gamepad2,
      description: 'By member count',
      color: 'text-blue-500',
    },
    {
      title: 'New Users This Week',
      value: isLoading ? '—' : newUsersThisWeek.toString(),
      icon: Users,
      description: 'Recently joined',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
