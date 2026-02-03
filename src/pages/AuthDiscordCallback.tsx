import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthDiscordCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for Discord OAuth error
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || 'Discord authorization was denied');
        toast({
          title: 'Authorization Failed',
          description: errorDescription || 'Discord authorization was denied',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings', { replace: true }), 3000);
        return;
      }

      // Validate state for CSRF protection
      const storedState = sessionStorage.getItem('discord_oauth_state');
      if (!state || state !== storedState) {
        setStatus('error');
        setErrorMessage('Invalid state parameter. Please try again.');
        toast({
          title: 'Security Error',
          description: 'Invalid state parameter. Please try connecting again.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings', { replace: true }), 3000);
        return;
      }

      // Clear stored state
      sessionStorage.removeItem('discord_oauth_state');

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        toast({
          title: 'Error',
          description: 'No authorization code received from Discord.',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings', { replace: true }), 3000);
        return;
      }

      try {
        // Exchange code for tokens via edge function
        const redirectUri = `${window.location.origin}/auth/discord/callback`;
        
        const { data, error: invokeError } = await supabase.functions.invoke('discord-oauth/connect', {
          body: { code, redirect_uri: redirectUri },
        });

        if (invokeError) {
          throw invokeError;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to connect Discord');
        }

        setStatus('success');
        toast({
          title: 'Discord Connected!',
          description: `Successfully linked @${data.discord.username}`,
        });

        // Redirect to settings after brief success message
        setTimeout(() => navigate('/settings', { replace: true }), 2000);

      } catch (error) {
        console.error('Discord connection error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to connect Discord');
        toast({
          title: 'Connection Failed',
          description: error instanceof Error ? error.message : 'Failed to connect Discord',
          variant: 'destructive',
        });
        setTimeout(() => navigate('/settings', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Connecting Discord...</h1>
            <p className="text-muted-foreground">Please wait while we link your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Discord Connected!</h1>
            <p className="text-muted-foreground">Redirecting you back to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Connection Failed</h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">Redirecting you back to settings...</p>
          </>
        )}
      </div>
    </div>
  );
}
