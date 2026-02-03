import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface DiscordConnection {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  globalName: string | null;
  avatarHash: string | null;
  bannerHash: string | null;
  accentColor: number | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  isActive: boolean;
  scopes: string[];
}

interface UseDiscordConnectionReturn {
  connection: DiscordConnection | null;
  isLoading: boolean;
  isConfigured: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  checkConfiguration: () => Promise<boolean>;
  getAvatarUrl: () => string | null;
  refetch: () => Promise<void>;
}

const DISCORD_OAUTH_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_CDN_URL = 'https://cdn.discordapp.com';

export function useDiscordConnection(): UseDiscordConnectionReturn {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<DiscordConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_discord_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching Discord connection:', error);
        setConnection(null);
      } else if (data) {
        setConnection({
          id: data.id,
          discordId: data.discord_id,
          username: data.discord_username,
          discriminator: data.discord_discriminator,
          globalName: data.discord_global_name,
          avatarHash: data.discord_avatar_hash,
          bannerHash: data.discord_banner_hash,
          accentColor: data.discord_accent_color,
          connectedAt: data.connected_at,
          lastSyncedAt: data.last_synced_at,
          isActive: data.is_active,
          scopes: data.scopes,
        });
      } else {
        setConnection(null);
      }
    } catch (error) {
      console.error('Error fetching Discord connection:', error);
      setConnection(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkConfiguration = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('discord-oauth/status');
      
      if (error) {
        console.error('Error checking Discord configuration:', error);
        setIsConfigured(false);
        return false;
      }
      
      const configured = data?.configured ?? false;
      setIsConfigured(configured);
      return configured;
    } catch (error) {
      console.error('Error checking Discord configuration:', error);
      setIsConfigured(false);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchConnection();
    checkConfiguration();
  }, [fetchConnection, checkConfiguration]);

  const connect = useCallback(() => {
    if (!isConfigured) {
      console.warn('Discord OAuth not configured');
      return;
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    sessionStorage.setItem('discord_oauth_state', state);

    // Get client ID from edge function status (or env for preview)
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    
    if (!clientId) {
      console.warn('Discord Client ID not available');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/discord/callback`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds guilds.members.read',
      state,
      prompt: 'consent',
    });

    setIsConnecting(true);
    window.location.href = `${DISCORD_OAUTH_URL}?${params.toString()}`;
  }, [isConfigured]);

  const disconnect = useCallback(async () => {
    if (!session?.access_token) return;

    setIsDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('discord-oauth/disconnect', {
        method: 'DELETE',
      });

      if (error) {
        throw error;
      }

      setConnection(null);
    } finally {
      setIsDisconnecting(false);
    }
  }, [session]);

  const getAvatarUrl = useCallback((): string | null => {
    if (!connection?.avatarHash || !connection.discordId) return null;
    return `${DISCORD_CDN_URL}/avatars/${connection.discordId}/${connection.avatarHash}.png?size=256`;
  }, [connection]);

  return {
    connection,
    isLoading,
    isConfigured,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
    checkConfiguration,
    getAvatarUrl,
    refetch: fetchConnection,
  };
}
