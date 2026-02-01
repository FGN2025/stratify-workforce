import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { SimGameEditDialog } from './SimGameEditDialog';
import { 
  Truck, 
  Tractor, 
  HardHat, 
  Wrench, 
  Users, 
  ClipboardList,
  Edit,
  Plus,
  Gamepad2
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GameChannel = Database['public']['Tables']['game_channels']['Row'];
type GameTitle = Database['public']['Enums']['game_title'];

const gameIcons: Record<GameTitle, React.ReactNode> = {
  ATS: <Truck className="h-6 w-6" />,
  Farming_Sim: <Tractor className="h-6 w-6" />,
  Construction_Sim: <HardHat className="h-6 w-6" />,
  Mechanic_Sim: <Wrench className="h-6 w-6" />,
};

const gameLabels: Record<GameTitle, string> = {
  ATS: 'American Truck Simulator',
  Farming_Sim: 'Farming Simulator',
  Construction_Sim: 'Construction Simulator',
  Mechanic_Sim: 'Mechanic Simulator',
};

export function SimGamesManager() {
  const [channels, setChannels] = useState<GameChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<GameChannel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching game channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load game channels.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (channel: GameChannel) => {
    setEditingChannel(channel);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingChannel(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<GameChannel>) => {
    try {
      if (editingChannel) {
        // Update existing
        const { error } = await supabase
          .from('game_channels')
          .update({
            name: data.name,
            description: data.description,
            accent_color: data.accent_color,
            cover_image_url: data.cover_image_url,
          })
          .eq('id', editingChannel.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Game channel updated.' });
      } else {
        // Create new
        const { error } = await supabase
          .from('game_channels')
          .insert({
            name: data.name!,
            game_title: data.game_title!,
            description: data.description,
            accent_color: data.accent_color || '#10b981',
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Game channel created.' });
      }

      setIsDialogOpen(false);
      fetchChannels();
    } catch (error) {
      console.error('Error saving game channel:', error);
      toast({
        title: 'Error',
        description: 'Failed to save game channel.',
        variant: 'destructive',
      });
    }
  };

  // Get existing game titles that have channels
  const existingGameTitles = channels.map(c => c.game_title);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" />
            SIM Games Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure simulation games, descriptions, and track details
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Game Channel
        </Button>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => (
          <Card 
            key={channel.id} 
            className="border-border/50 overflow-hidden"
            style={{ borderLeftColor: channel.accent_color, borderLeftWidth: '4px' }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${channel.accent_color}20` }}
                  >
                    <div style={{ color: channel.accent_color }}>
                      {gameIcons[channel.game_title]}
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-base">{channel.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {gameLabels[channel.game_title]}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(channel)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {channel.description || 'No description set. Click edit to add one.'}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{channel.member_count}</span>
                  <span className="text-xs text-muted-foreground">subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{channel.work_order_count}</span>
                  <span className="text-xs text-muted-foreground">work orders</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  style={{ borderColor: channel.accent_color, color: channel.accent_color }}
                >
                  {channel.game_title.replace('_', ' ')}
                </Badge>
                {channel.cover_image_url && (
                  <Badge variant="secondary" className="text-xs">
                    Has Cover Image
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {channels.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">No game channels configured</p>
          <p className="text-sm text-muted-foreground/70">
            Add simulation games to enable skill tracking and work orders.
          </p>
          <Button onClick={handleCreate} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add First Game Channel
          </Button>
        </div>
      )}

      {/* Edit/Create Dialog */}
      <SimGameEditDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        channel={editingChannel}
        existingGameTitles={existingGameTitles}
        onSave={handleSave}
      />
    </div>
  );
}
