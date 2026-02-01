import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { useGameCoverImages } from '@/hooks/useSiteMedia';
import type { WorkOrder, GameTitle, Tenant } from '@/types/tenant';
import { Users, Monitor, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  workOrder: WorkOrder;
  community?: Pick<Tenant, 'id' | 'name' | 'slug' | 'brand_color' | 'logo_url'>;
  participantCount?: number;
  rating?: number;
  schedule?: string;
  variant?: 'default' | 'compact' | 'featured';
}

export function EventCard({ 
  workOrder, 
  community, 
  participantCount = Math.floor(Math.random() * 100) + 20,
  rating = Math.floor(Math.random() * 500) + 1500,
  schedule = 'Fridays at 2:30pm',
  variant = 'default' 
}: EventCardProps) {
  const criteria = workOrder.success_criteria as Record<string, number>;
  const { gameCoverImages } = useGameCoverImages();
  const coverImage = gameCoverImages[workOrder.game_title];

  if (variant === 'compact') {
    return (
      <NavLink 
        to={`/work-orders/${workOrder.id}`}
        className="group block"
      >
        <div className="glass-card overflow-hidden hover:border-primary/50 transition-all">
          <div className="flex gap-4 p-4">
            <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
              <img 
                src={coverImage} 
                alt={workOrder.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-2 left-2">
                <GameIcon game={workOrder.game_title} size="sm" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {community && (
                <div className="flex items-center gap-2 mb-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={community.logo_url || ''} />
                    <AvatarFallback className="text-[8px]" style={{ backgroundColor: community.brand_color }}>
                      {community.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {community.name}
                  </span>
                </div>
              )}
              
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {workOrder.title}
              </h3>
              
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {workOrder.description}
              </p>
              
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {getGameLabel(workOrder.game_title)}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participantCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </NavLink>
    );
  }

  return (
    <NavLink 
      to={`/work-orders/${workOrder.id}`}
      className="group block"
    >
      <div className="glass-card overflow-hidden hover:border-primary/50 transition-all hover:glow-sm">
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden">
          <img 
            src={coverImage} 
            alt={workOrder.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Game Badge Overlay */}
          <div className="absolute top-3 right-3">
            <Badge 
              variant="outline" 
              className="bg-background/80 backdrop-blur-sm border-border text-[10px] gap-1"
            >
              <Monitor className="h-3 w-3" />
              {getGameLabel(workOrder.game_title)}
            </Badge>
          </div>
          
          {/* Featured badge */}
          {variant === 'featured' && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-primary text-primary-foreground text-[10px]">
                FEATURED
              </Badge>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Community Info */}
          {community && (
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-5 w-5 border border-border">
                <AvatarImage src={community.logo_url || ''} />
                <AvatarFallback 
                  className="text-[8px] text-white"
                  style={{ backgroundColor: community.brand_color }}
                >
                  {community.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <NavLink 
                to={`/community/${community.slug}`}
                className="text-[11px] text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {community.name}
              </NavLink>
            </div>
          )}
          
          {/* Title */}
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
            {workOrder.title}
          </h3>
          
          {/* Schedule */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Solo event at <span className="text-foreground">{schedule}</span></span>
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
            <div className="flex items-center gap-1">
              <span className="font-data text-sm text-primary">{participantCount}</span>
              <span className="text-[10px] text-muted-foreground">enrolled</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              <span className="font-data text-xs text-muted-foreground">{rating.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
              <GameIcon game={workOrder.game_title} size="sm" />
              <span>·</span>
              <Monitor className="h-3 w-3" />
              <span>PC</span>
            </div>
          </div>
        </div>
      </div>
    </NavLink>
  );
}
