import { Gauge, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-primary',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    error: 'text-red-500',
  };

  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn("text-3xl font-bold font-data", variantStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg transition-colors",
          "bg-muted group-hover:bg-primary/20"
        )}>
          <Icon className={cn("h-5 w-5", variantStyles[variant])} />
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 pt-4 border-t border-border">
          <span className={cn(
            "text-xs font-medium font-data",
            trend.positive ? "text-emerald-500" : "text-red-500"
          )}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-muted-foreground ml-2">vs last week</span>
        </div>
      )}
    </div>
  );
}

export function StatsGrid() {
  const stats: StatCardProps[] = [
    {
      title: 'Employability Score',
      value: '78.5',
      subtitle: 'Top 15% of cohort',
      icon: Gauge,
      trend: { value: 4.2, positive: true },
      variant: 'success',
    },
    {
      title: 'Total Training Hours',
      value: '142.8',
      subtitle: 'This quarter',
      icon: Clock,
      trend: { value: 12, positive: true },
    },
    {
      title: 'Safety Violations',
      value: '3',
      subtitle: 'Last 30 days',
      icon: AlertTriangle,
      trend: { value: -25, positive: true },
      variant: 'warning',
    },
    {
      title: 'Jobs Completed',
      value: '47',
      subtitle: '94% success rate',
      icon: CheckCircle2,
      trend: { value: 8, positive: true },
      variant: 'success',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}
