import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, Star, Pencil } from 'lucide-react';
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
  onEdit?: () => void;
}

export function CommunityCard({ 
  community, 
  memberCount = Math.floor(Math.random() * 500) + 50,
  eventCount = Math.floor(Math.random() * 20) + 5,
  rating = parseFloat((Math.random() * 2 + 3).toFixed(1)),
  featured = false,
  onEdit,
}: CommunityCardProps) {
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleLogoSelect = async (url: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: url })
        .eq('id', community.id);

      if (error) throw error;

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

  const handleCoverImageSelect = async (url: string) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ cover_image_url: url })
        .eq('id', community.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', community.slug] });

      toast({
        title: 'Cover image updated',
        description: 'The community cover image has been changed successfully.',
      });
    } catch (error) {
      console.error('Error updating community cover image:', error);
      toast({
        title: 'Update failed',
        description: 'Could not update the community cover image.',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.();
  };

  return (
    <>
      <NavLink 
        to={`/community/${community.slug}`}
        className="group block w-full"
      >
        <div className="glass-card overflow-hidden hover:border-primary/50 transition-all h-full relative">
          {/* Hero Image Section */}
          <div className="relative h-32">
            {/* Cover Image or Brand Color Fallback */}
            <EditableImageWrapper 
              onEdit={() => setIsCoverPickerOpen(true)}
              position="top-right"
              className="h-full w-full"
            >
              <div 
                className="h-full w-full bg-cover bg-center"
                style={{ 
                  backgroundColor: community.brand_color,
                  backgroundImage: community.cover_image_url 
                    ? `url(${community.cover_image_url})` 
                    : undefined,
                }}
              />
            </EditableImageWrapper>
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
            
            {/* Logo Avatar Overlay - positioned at bottom left */}
            <div className="absolute -bottom-6 left-4 z-10">
              <EditableImageWrapper 
                onEdit={() => setIsLogoPickerOpen(true)}
                position="center"
              >
                <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                  <AvatarImage src={community.logo_url || ''} />
                  <AvatarFallback 
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: community.brand_color }}
                  >
                    {community.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </EditableImageWrapper>
            </div>

            {/* Featured Badge */}
            {featured && (
              <Badge className="absolute top-2 left-2 bg-primary/20 text-primary border-primary/30 text-[10px]">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                Featured
              </Badge>
            )}

            {/* Admin Edit Button */}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-20 h-8 w-8 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleEditClick}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 pt-8">
            {/* Name and Slug */}
            <div className="mb-4">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {community.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{community.slug}
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
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

      {/* Logo Picker Dialog */}
      <MediaPickerDialog
        open={isLogoPickerOpen}
        onOpenChange={setIsLogoPickerOpen}
        onSelect={handleLogoSelect}
        title="Change Community Logo"
        currentImageUrl={community.logo_url || undefined}
      />

      {/* Cover Image Picker Dialog */}
      <MediaPickerDialog
        open={isCoverPickerOpen}
        onOpenChange={setIsCoverPickerOpen}
        onSelect={handleCoverImageSelect}
        title="Change Cover Image"
        currentImageUrl={community.cover_image_url || undefined}
      />
    </>
  );
}
