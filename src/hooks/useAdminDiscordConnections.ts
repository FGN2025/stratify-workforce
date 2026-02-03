import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AdminDiscordConnection {
  id: string;
  userId: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  globalName: string | null;
  avatarHash: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  isActive: boolean;
  scopes: string[];
  // Joined profile data
  profile?: {
    username: string | null;
    avatarUrl: string | null;
  };
}

interface UseAdminDiscordConnectionsReturn {
  connections: AdminDiscordConnection[];
  isLoading: boolean;
  totalCount: number;
  toggleActive: (connectionId: string, isActive: boolean) => Promise<void>;
  forceDisconnect: (connectionId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAdminDiscordConnections(): UseAdminDiscordConnectionsReturn {
  const [connections, setConnections] = useState<AdminDiscordConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all Discord connections
      const { data, error, count } = await supabase
        .from('user_discord_connections')
        .select('*', { count: 'exact' })
        .order('connected_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) {
        setConnections([]);
        setTotalCount(0);
        return;
      }

      // Fetch profile data for all users
      const userIds = data.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, { username: p.username, avatarUrl: p.avatar_url }]) || []
      );

      const mappedConnections: AdminDiscordConnection[] = data.map(c => ({
        id: c.id,
        userId: c.user_id,
        discordId: c.discord_id,
        username: c.discord_username,
        discriminator: c.discord_discriminator,
        globalName: c.discord_global_name,
        avatarHash: c.discord_avatar_hash,
        connectedAt: c.connected_at,
        lastSyncedAt: c.last_synced_at,
        isActive: c.is_active,
        scopes: c.scopes,
        profile: profileMap.get(c.user_id),
      }));

      setConnections(mappedConnections);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching Discord connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Discord connections.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const toggleActive = useCallback(async (connectionId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_discord_connections')
        .update({ is_active: isActive })
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(prev =>
        prev.map(c => (c.id === connectionId ? { ...c, isActive } : c))
      );

      toast({
        title: isActive ? 'Connection Enabled' : 'Connection Disabled',
        description: `Discord connection has been ${isActive ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error toggling connection:', error);
      toast({
        title: 'Error',
        description: 'Failed to update connection status.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  const forceDisconnect = useCallback(async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_discord_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      setConnections(prev => prev.filter(c => c.id !== connectionId));
      setTotalCount(prev => prev - 1);

      toast({
        title: 'Connection Removed',
        description: 'Discord connection has been removed.',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove Discord connection.',
        variant: 'destructive',
      });
      throw error;
    }
  }, []);

  return {
    connections,
    isLoading,
    totalCount,
    toggleActive,
    forceDisconnect,
    refetch: fetchConnections,
  };
}
