-- Create user_discord_connections table
CREATE TABLE public.user_discord_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discord Identity
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar_hash TEXT,
  discord_banner_hash TEXT,
  discord_accent_color INTEGER,
  discord_global_name TEXT,
  
  -- OAuth Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['identify'],
  
  -- Metadata
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discord_connections_user ON user_discord_connections(user_id);
CREATE INDEX idx_discord_connections_discord_id ON user_discord_connections(discord_id);

-- Updated at trigger
CREATE TRIGGER update_discord_connections_updated_at
  BEFORE UPDATE ON user_discord_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE user_discord_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connection
CREATE POLICY "Users can view own discord connection"
ON user_discord_connections FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own connection (disconnect)
CREATE POLICY "Users can disconnect own discord"
ON user_discord_connections FOR DELETE
TO authenticated
USING (user_id = auth.uid());