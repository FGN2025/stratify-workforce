import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';

const mockLeaderboard = [
  { rank: 1, username: 'TruckerMike', score: 94.2, change: 2, hours: 245 },
  { rank: 2, username: 'SarahFields', score: 91.8, change: 0, hours: 198 },
  { rank: 3, username: 'BuilderJohn', score: 89.5, change: -1, hours: 167 },
  { rank: 4, username: 'Marcus Johnson', score: 78.5, change: 3, hours: 142 },
  { rank: 5, username: 'JennyDriver', score: 76.2, change: 1, hours: 134 },
  { rank: 6, username: 'Alex Torres', score: 74.8, change: -2, hours: 128 },
  { rank: 7, username: 'Kim Chen', score: 72.1, change: 0, hours: 115 },
  { rank: 8, username: 'Bob Williams', score: 68.9, change: 4, hours: 98 },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Trophy className="h-4 w-4 text-amber-500" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-400/20 flex items-center justify-center">
        <Medal className="h-4 w-4 text-slate-400" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-700/20 flex items-center justify-center">
        <Medal className="h-4 w-4 text-amber-700" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="font-data text-sm text-muted-foreground">{rank}</span>
    </div>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <div className="flex items-center gap-0.5 text-emerald-500 text-xs">
        <TrendingUp className="h-3 w-3" />
        <span className="font-data">+{change}</span>
      </div>
    );
  }
  if (change < 0) {
    return (
      <div className="flex items-center gap-0.5 text-red-500 text-xs">
        <TrendingDown className="h-3 w-3" />
        <span className="font-data">{change}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5 text-muted-foreground text-xs">
      <Minus className="h-3 w-3" />
    </div>
  );
}

const Leaderboard = () => {
  const { tenant } = useTenant();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Top performers in {tenant?.name || 'your organization'}
            </p>
          </div>
          <Badge variant="outline" className="font-data">
            Updated 5m ago
          </Badge>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Operator</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">Hours</div>
            <div className="col-span-2 text-right">Change</div>
          </div>

          <div className="divide-y divide-border">
            {mockLeaderboard.map((entry, index) => (
              <div 
                key={entry.rank}
                className={cn(
                  "grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors",
                  entry.username === 'Marcus Johnson' && "bg-primary/5 border-l-2 border-l-primary"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="col-span-1">
                  <RankBadge rank={entry.rank} />
                </div>
                
                <div className="col-span-5 flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarFallback className="text-xs bg-muted">
                      {entry.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{entry.username}</p>
                    {entry.username === 'Marcus Johnson' && (
                      <p className="text-xs text-primary">You</p>
                    )}
                  </div>
                </div>

                <div className="col-span-2 text-right">
                  <span className={cn(
                    "font-data text-lg",
                    entry.rank <= 3 ? "text-primary" : "text-foreground"
                  )}>
                    {entry.score}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className="font-data text-muted-foreground">
                    {entry.hours}h
                  </span>
                </div>

                <div className="col-span-2 flex justify-end">
                  <ChangeIndicator change={entry.change} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
