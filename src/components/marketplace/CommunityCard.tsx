import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, Star } from 'lucide-react';
import type { Tenant } from '@/types/tenant';
import { EditableImageWrapper } from '@/components/admin/EditableImageWrapper';
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface CommunityCardProps {
  community: Tenant;
  memberCount?: number;
  eventCount?: number;
  rating?: number;
  featured?: boolean;
}

export function CommunityCard({ 
  community, 
  memberCount = Math.floor(Math.random() * 500) + 50,
  eventCount = Math.floor(Math.random() * 20) + 5,
  rating = parseFloat((Math.random() * 2 + 3).toFixed(1)),
  featured = false
}: CommunityCardProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleImageSelect = async (url: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: url })
        .eq('id', community.id);

      if (error) throw error;

      // Invalidate relevant queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', community.slug] });

      toast({
        title: 'Logo updated',
        description: 'The community logo has been changed successfully.',
      });
    } catch (error) {
      console.error('Error updating community logo:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update the community logo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <NavLink 
        to={`/community/${community.slug}`}
        className="group block w-full"
      >
        <div 
          className="glass-card overflow-hidden hover:border-primary/50 transition-all h-full"
          style={{ borderTopColor: community.brand_color, borderTopWidth: '3px' }}
        >
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <EditableImageWrapper 
                onEdit={() => setIsPickerOpen(true)}
                position="center"
              >
                <Avatar className="h-14 w-14 border-2 border-border">
                  <AvatarImage src={community.logo_url || ''} />
                  <AvatarFallback 
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: community.brand_color }}
                  >
                    {community.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </EditableImageWrapper>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {community.name}
                  </h3>
                  {featured && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  @{community.slug}
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Users className="h-3 w-3" />
                </div>
                <p className="font-data text-lg text-foreground">{memberCount}</p>
                <p className="text-[10px] text-muted-foreground">Members</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Trophy className="h-3 w-3" />
                </div>
                <p className="font-data text-lg text-foreground">{eventCount}</p>
                <p className="text-[10px] text-muted-foreground">Events</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Star className="h-3 w-3" />
                </div>
                <p className="font-data text-lg text-foreground">{rating}</p>
                <p className="text-[10px] text-muted-foreground">Rating</p>
              </div>
            </div>
          </div>
        </div>
      </NavLink>

      <MediaPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onSelect={handleImageSelect}
        title="Change Community Logo"
        currentImageUrl={community.logo_url || undefined}
      />
    </>
  );
}
