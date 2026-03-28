import { Bell, Trophy, Zap, Award, Target, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications, type UserNotification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  zap: Zap,
  award: Award,
  target: Target,
  bell: Bell,
};

function NotificationItem({ notification, onRead }: { notification: UserNotification; onRead: () => void }) {
  const navigate = useNavigate();
  const Icon = iconMap[notification.icon_name] || Bell;

  const handleClick = () => {
    onRead();
    if (notification.link_url) navigate(notification.link_url);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 flex gap-3 ${
        !notification.is_read ? 'bg-primary/5' : ''
      }`}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{ backgroundColor: `${notification.accent_color}20`, color: notification.accent_color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-tight ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <span className="shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const recent = notifications.slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCircle className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {recent.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            recent.map(n => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={() => !n.is_read && markAsRead.mutate(n.id)}
              />
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <button
              onClick={() => navigate('/activity')}
              className="w-full text-center text-xs text-primary hover:underline flex items-center justify-center gap-1 py-1"
            >
              View all activity <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
