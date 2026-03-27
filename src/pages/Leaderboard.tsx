import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Crown, Star, Flame, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenant } from '@/contexts/TenantContext';
import { useLeaderboard, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { useAuth } from '@/contexts/AuthContext';

function TopThreeCard({ entry, position, isCurrentUser }: { entry: LeaderboardEntry; position: 1 | 2 | 3; isCurrentUser: boolean }) {
  const config = {
    1: { icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/20', borderColor: 'border-amber-500/50', size: 'h-20 w-20' },
    2: { icon: Medal, color: 'text-slate-300', bgColor: 'bg-slate-400/20', borderColor: 'border-slate-400/50', size: 'h-16 w-16' },
    3: { icon: Medal, color: 'text-amber-700', bgColor: 'bg-amber-700/20', borderColor: 'border-amber-700/50', size: 'h-16 w-16' },
  };
  const { icon: Icon, color, bgColor, borderColor, size } = config[position];

  return (
    <Card className={cn(
      "glass-card border-2 transition-all hover:glow-sm relative overflow-hidden",
      borderColor,
      position === 1 && "scale-105",
      isCurrentUser && "ring-2 ring-primary"
    )}>
      <div className={cn("absolute top-2 right-2", bgColor, "rounded-full p-1.5")}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <CardContent className="p-6 text-center">
        <Avatar className={cn(size, "mx-auto border-2", borderColor)}>
          {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} />}
          <AvatarFallback className={cn("text-lg font-bold", bgColor, color)}>
            {entry.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold mt-3">
          {entry.username}
          {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
        </h3>
        <p className={cn("font-data text-2xl font-bold mt-1", color)}>
          {entry.score}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{entry.hours}h played</span>
          <ChangeIndicator change={entry.change} />
        </div>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center"><Trophy className="h-4 w-4 text-amber-500" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-400/20 flex items-center justify-center"><Medal className="h-4 w-4 text-slate-400" /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-700/20 flex items-center justify-center"><Medal className="h-4 w-4 text-amber-700" /></div>;
  return <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"><span className="font-data text-sm text-muted-foreground">{rank}</span></div>;
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) return <div className="flex items-center gap-0.5 text-emerald-500 text-xs"><TrendingUp className="h-3 w-3" /><span className="font-data">+{change}</span></div>;
  if (change < 0) return <div className="flex items-center gap-0.5 text-red-500 text-xs"><TrendingDown className="h-3 w-3" /><span className="font-data">{change}</span></div>;
  return <div className="flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="h-3 w-3" /></div>;
}

function CompactLeaderCard({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  return (
    <div className={cn(
      "glass-card p-4 min-w-[200px] hover:border-primary/50 transition-all",
      isCurrentUser && "border-primary/50 bg-primary/5"
    )}>
      <div className="flex items-center gap-3">
        <RankBadge rank={entry.rank} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{entry.username}</p>
          {isCurrentUser && <p className="text-xs text-primary">You</p>}
        </div>
        <div className="text-right">
          <p className="font-data text-lg text-primary">{entry.score}</p>
          <ChangeIndicator change={entry.change} />
        </div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

const Leaderboard = () => {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { entries, currentUserEntry, isLoading } = useLeaderboard();

  const topThree = entries.slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHero
          title="Leaderboard"
          subtitle="Compete with operators worldwide. Track your progress, climb the ranks, and prove your expertise in industrial simulation."
          backgroundImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=600&fit=crop"
          stats={[
            { value: `${entries.length}`, label: 'Total Players', highlight: true },
            { value: currentUserEntry ? `#${currentUserEntry.rank}` : '—', label: 'Your Rank' },
            { value: currentUserEntry ? `${currentUserEntry.score}` : '—', label: 'Your Score' },
          ]}
        />

        {isLoading ? (
          <LeaderboardSkeleton />
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length >= 3 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide">Top Operators</h2>
                    <p className="text-sm text-muted-foreground">Current champions</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="order-2 md:order-1">
                    <TopThreeCard entry={topThree[1]} position={2} isCurrentUser={topThree[1].userId === user?.id} />
                  </div>
                  <div className="order-1 md:order-2">
                    <TopThreeCard entry={topThree[0]} position={1} isCurrentUser={topThree[0].userId === user?.id} />
                  </div>
                  <div className="order-3">
                    <TopThreeCard entry={topThree[2]} position={3} isCurrentUser={topThree[2].userId === user?.id} />
                  </div>
                </div>
              </section>
            )}

            {/* Rising Stars — hidden for now since change is always 0 */}
            {entries.some(e => e.change > 0) && (
              <HorizontalCarousel
                title="Rising Stars"
                subtitle="Operators climbing the ranks fastest"
                icon={<Flame className="h-5 w-5" />}
              >
                {entries
                  .filter(e => e.change > 0)
                  .sort((a, b) => b.change - a.change)
                  .map((entry) => (
                    <div key={`rising-${entry.userId}`} className="shrink-0 snap-start">
                      <CompactLeaderCard entry={entry} isCurrentUser={entry.userId === user?.id} />
                    </div>
                  ))}
              </HorizontalCarousel>
            )}

            {/* Full Leaderboard Table */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-bold uppercase tracking-wide">Full Rankings</h2>
                    <p className="text-sm text-muted-foreground">All operators in {tenant?.name || 'your organization'}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Operator</div>
                  <div className="col-span-2 text-right">Score</div>
                  <div className="col-span-2 text-right">Hours</div>
                  <div className="col-span-2 text-right">XP</div>
                </div>

                <div className="divide-y divide-border">
                  {entries.map((entry, index) => {
                    const isMe = entry.userId === user?.id;
                    return (
                      <div
                        key={entry.userId}
                        className={cn(
                          "grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors",
                          isMe && "bg-primary/5 border-l-2 border-l-primary"
                        )}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="col-span-1">
                          <RankBadge rank={entry.rank} />
                        </div>
                        <div className="col-span-5 flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            {entry.avatarUrl && <AvatarImage src={entry.avatarUrl} />}
                            <AvatarFallback className="text-xs bg-muted">
                              {entry.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{entry.username}</p>
                            {isMe && <p className="text-xs text-primary">You</p>}
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className={cn("font-data text-lg", entry.rank <= 3 ? "text-primary" : "text-foreground")}>
                            {entry.score}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-data text-muted-foreground">{entry.hours}h</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-data text-muted-foreground">{entry.xp.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Leaderboard;
