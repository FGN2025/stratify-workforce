import { ShieldCheck, Users, ClipboardList, Activity } from 'lucide-react';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';

interface AdminStats {
  totalUsers: number;
  totalWorkOrders: number;
  activeSessions: number;
}

interface AdminHeroProps {
  stats: AdminStats;
  isLoading?: boolean;
}

export function AdminHero({ stats, isLoading }: AdminHeroProps) {
  const heroImageUrl = useSiteMediaUrl('admin_hero');

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImageUrl}
          alt="Admin Dashboard"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Glow effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 p-8 md:p-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            System Administration
          </span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mb-8">
          Manage users, work orders, media assets, and communities across the entire platform.
        </p>
        
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={isLoading ? '—' : stats.totalUsers.toString()}
            color="text-blue-400"
          />
          <StatCard
            icon={ClipboardList}
            label="Work Orders"
            value={isLoading ? '—' : stats.totalWorkOrders.toString()}
            color="text-amber-400"
          />
          <StatCard
            icon={Activity}
            label="Active Sessions"
            value={isLoading ? '—' : stats.activeSessions.toString()}
            color="text-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-background/50 backdrop-blur-sm rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
