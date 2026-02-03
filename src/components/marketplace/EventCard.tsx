import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { DifficultyIndicator } from '@/components/work-orders/DifficultyIndicator';
import { EditableImageWrapper } from '@/components/admin/EditableImageWrapper';
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog';
import { useGameCoverImages } from '@/hooks/useSiteMedia';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { Tenant, WorkOrder } from '@/types/tenant';
import type { WorkOrderWithXP } from '@/hooks/useWorkOrders';
import type { Database } from '@/integrations/supabase/types';
import { Users, Monitor, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

// Support both old WorkOrder and new WorkOrderWithXP
type WorkOrderInput = WorkOrder | WorkOrderWithXP;

interface EventCardProps {
  workOrder: WorkOrderInput;
  community?: Pick<Tenant, 'id' | 'name' | 'slug' | 'brand_color' | 'logo_url'>;
  participantCount?: number;
  rating?: number;
  schedule?: string;
  variant?: 'default' | 'compact' | 'featured';
  isCompleted?: boolean;
}

export function EventCard({ 
  workOrder, 
  community, 
  participantCount = Math.floor(Math.random() * 100) + 20,
  rating = Math.floor(Math.random() * 500) + 1500,
  schedule = 'Fridays at 2:30pm',
  variant = 'default',
  isCompleted = false,
}: EventCardProps) {
  const queryClient = useQueryClient();
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  
  // Handle both old and new work order types
  const xpReward = 'xp_reward' in workOrder ? workOrder.xp_reward : 50;
  const difficulty: WorkOrderDifficulty = 'difficulty' in workOrder ? workOrder.difficulty : 'beginner';
  const estimatedTime = 'estimated_time_minutes' in workOrder ? workOrder.estimated_time_minutes : null;
  const workOrderCoverUrl = 'cover_image_url' in workOrder ? workOrder.cover_image_url : null;
  
  const { gameCoverImages } = useGameCoverImages();
  // Use work order's custom cover if available, otherwise fall back to game cover
  const coverImage = workOrderCoverUrl || gameCoverImages[workOrder.game_title];

  const handleCoverImageUpdate = async (url: string) => {
    try {
      const { error } = await supabase
        .from('work_orders')
        .update({ cover_image_url: url })
        .eq('id', workOrder.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrder.id] });
      toast({ title: 'Cover image updated' });
    } catch (error) {
      console.error('Error updating cover image:', error);
      toast({ title: 'Failed to update image', variant: 'destructive' });
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <NavLink 
          to={`/work-orders/${workOrder.id}`}
          className="group block"
        >
          <div className="glass-card overflow-hidden hover:border-primary/50 transition-all">
            <div className="flex gap-4 p-4">
              <EditableImageWrapper
                onEdit={() => setShowMediaPicker(true)}
                className="w-24 h-24 shrink-0 rounded-lg overflow-hidden"
                position="center"
              >
                <div className="relative w-full h-full">
                  <img 
                    src={coverImage} 
                    alt={workOrder.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-2 left-2">
                    <GameIcon game={workOrder.game_title} size="sm" />
                  </div>
                  {isCompleted && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-4 w-4 text-primary fill-primary/20" />
                    </div>
                  )}
                </div>
              </EditableImageWrapper>
              
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
                  <XPRewardBadge xp={xpReward} size="sm" />
                  <DifficultyIndicator difficulty={difficulty} size="sm" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {participantCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NavLink>
        <MediaPickerDialog
          open={showMediaPicker}
          onOpenChange={setShowMediaPicker}
          onSelect={handleCoverImageUpdate}
          title="Change Work Order Cover"
          currentImageUrl={coverImage}
        />
      </>
    );
  }

  return (
    <NavLink 
      to={`/work-orders/${workOrder.id}`}
      className="group block"
    >
      <div className="glass-card overflow-hidden hover:border-primary/50 transition-all hover:glow-sm">
        {/* Cover Image */}
        <EditableImageWrapper
          onEdit={() => setShowMediaPicker(true)}
          className="relative h-40 overflow-hidden"
          position="top-right"
        >
          <img 
            src={coverImage} 
            alt={workOrder.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* XP Badge Overlay */}
          <div className="absolute top-3 left-3">
            <XPRewardBadge xp={xpReward} />
          </div>
          
          {/* Game Badge Overlay - moved to avoid overlap with edit button */}
          <div className="absolute top-12 right-3">
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
            <div className="absolute bottom-3 left-3">
              <Badge className="bg-primary text-primary-foreground text-[10px]">
                FEATURED
              </Badge>
            </div>
          )}

          {/* Completed indicator */}
          {isCompleted && (
            <div className="absolute bottom-3 right-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          )}
        </EditableImageWrapper>
        
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
          
          {/* Difficulty + Time */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <DifficultyIndicator difficulty={difficulty} showLabel size="sm" />
            {estimatedTime && (
              <>
                <span>•</span>
                <span>~{estimatedTime} min</span>
              </>
            )}
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
        <MediaPickerDialog
          open={showMediaPicker}
          onOpenChange={setShowMediaPicker}
          onSelect={handleCoverImageUpdate}
          title="Change Work Order Cover"
          currentImageUrl={coverImage}
        />
      </div>
    </NavLink>
  );
}
