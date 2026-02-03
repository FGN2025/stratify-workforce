import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2, Check, ExternalLink, Unlink } from 'lucide-react';
import { useDiscordConnection } from '@/hooks/useDiscordConnection';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Discord brand color
const DISCORD_COLOR = '#5865F2';

function DiscordIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function DiscordConnectionCard() {
  const {
    connection,
    isLoading,
    isConfigured,
    isConnecting,
    isDisconnecting,
    connect,
    disconnect,
    getAvatarUrl,
  } = useDiscordConnection();

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast({
        title: 'Discord Disconnected',
        description: 'Your Discord account has been unlinked.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect Discord. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Discord not configured by admin
  if (!isConfigured) {
    return (
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_COLOR }} />
            <CardTitle>Discord</CardTitle>
          </div>
          <CardDescription>
            Connect your Discord account for community features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
            <DiscordIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">Coming Soon!</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Discord integration is being set up by administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected
  if (!connection) {
    return (
      <Card className="glass-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_COLOR }} />
            <CardTitle>Discord</CardTitle>
          </div>
          <CardDescription>
            Link your Discord account to access community features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-medium mb-2">Why connect Discord?</h4>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Display your Discord profile on your FGN profile
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Access exclusive Discord community channels
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Sync your server roles automatically
              </li>
            </ul>
          </div>

          <Button
            onClick={connect}
            disabled={isConnecting}
            className="w-full"
            style={{ backgroundColor: DISCORD_COLOR }}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DiscordIcon className="h-4 w-4 mr-2" />
            )}
            Connect Discord
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected
  const avatarUrl = getAvatarUrl();
  const displayName = connection.globalName || connection.username;
  const usernameDisplay = connection.discriminator && connection.discriminator !== '0'
    ? `${connection.username}#${connection.discriminator}`
    : `@${connection.username}`;

  return (
    <Card className="glass-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_COLOR }} />
            <CardTitle>Discord</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className="border-primary/30 text-primary"
          >
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connected Account */}
        <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback style={{ backgroundColor: `${DISCORD_COLOR}20` }}>
              <DiscordIcon className="h-6 w-6" style={{ color: DISCORD_COLOR }} />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{usernameDisplay}</p>
          </div>
          <a
            href={`https://discord.com/users/${connection.discordId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Permissions */}
        <div>
          <p className="text-sm font-medium mb-2">Permissions granted:</p>
          <div className="flex flex-wrap gap-2">
            {connection.scopes.includes('identify') && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Basic profile info
              </Badge>
            )}
            {connection.scopes.includes('guilds') && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Server list
              </Badge>
            )}
            {connection.scopes.includes('guilds.members.read') && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Server roles
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Connection Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Connected {new Date(connection.connectedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-1" />
                )}
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Discord?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will unlink your Discord account from your FGN profile. 
                  You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDisconnect}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
