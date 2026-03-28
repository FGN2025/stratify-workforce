import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { useNotifications, type UserNotification } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Trophy, Zap, Award, Target, CheckCircle, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  zap: Zap,
  award: Award,
  target: Target,
  bell: Bell,
};

function groupByDate(notifications: UserNotification[]) {
  const groups: Record<string, UserNotification[]> = {};
  for (const n of notifications) {
    const key = format(new Date(n.created_at), 'MMMM d, yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return Object.entries(groups);
}

export default function Activity() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHero
          title="Activity Feed"
          subtitle="Challenge completions, credentials issued, and XP earned from your training journey."
          backgroundImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=600&fit=crop"
          stats={[
            { value: `${notifications.length}`, label: 'Total Events' },
            { value: `${unreadCount}`, label: 'Unread', highlight: true },
          ]}
          primaryAction={unreadCount > 0 ? {
            label: 'Mark All Read',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => markAllRead.mutate(),
          } : undefined}
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground">
                Complete challenges on play.fgn.gg to see your progress here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupByDate(notifications).map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</h3>
                <div className="space-y-2">
                  {items.map(n => {
                    const Icon = iconMap[n.icon_name] || Bell;
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead.mutate(n.id);
                          if (n.link_url) navigate(n.link_url);
                        }}
                        className={`w-full text-left glass-card p-4 flex gap-4 items-start hover:border-primary/30 transition-colors ${
                          !n.is_read ? 'border-primary/20 bg-primary/5' : ''
                        }`}
                      >
                        <div
                          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${n.accent_color}20`, color: n.accent_color }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                              {n.title}
                            </p>
                            {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                          </div>
                          {n.message && (
                            <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
