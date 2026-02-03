import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, MoreVertical, ExternalLink, Unlink, Eye, RefreshCw, Users } from 'lucide-react';
import { useAdminDiscordConnections, AdminDiscordConnection } from '@/hooks/useAdminDiscordConnections';
import { formatDistanceToNow } from 'date-fns';

const DISCORD_COLOR = '#5865F2';
const DISCORD_CDN_URL = 'https://cdn.discordapp.com';

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

function getDiscordAvatarUrl(discordId: string, avatarHash: string | null): string | null {
  if (!avatarHash) return null;
  return `${DISCORD_CDN_URL}/avatars/${discordId}/${avatarHash}.png?size=64`;
}

export function DiscordConnectionsManager() {
  const { connections, isLoading, totalCount, toggleActive, forceDisconnect, refetch } = useAdminDiscordConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<AdminDiscordConnection | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null);

  const filteredConnections = connections.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.username.toLowerCase().includes(query) ||
      c.discordId.includes(query) ||
      c.profile?.username?.toLowerCase().includes(query) ||
      c.globalName?.toLowerCase().includes(query)
    );
  });

  const handleViewDetails = (connection: AdminDiscordConnection) => {
    setSelectedConnection(connection);
    setShowDetailsDialog(true);
  };

  const handleConfirmDisconnect = async () => {
    if (pendingDisconnect) {
      await forceDisconnect(pendingDisconnect);
      setPendingDisconnect(null);
      setShowDisconnectDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${DISCORD_COLOR}20` }}>
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_COLOR }} />
          </div>
          <div>
            <h3 className="font-semibold">Discord Connections</h3>
            <p className="text-sm text-muted-foreground">
              {totalCount} linked {totalCount === 1 ? 'account' : 'accounts'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {connections.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-muted-foreground/30 rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h4 className="font-medium text-muted-foreground">No Discord Connections</h4>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Users haven't linked their Discord accounts yet.
          </p>
        </div>
      ) : (
        /* Connections Table */
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Discord Account</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnections.map((connection) => (
                <TableRow key={connection.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={connection.profile?.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {connection.profile?.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {connection.profile?.username || 'Unknown User'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={getDiscordAvatarUrl(connection.discordId, connection.avatarHash) || undefined} />
                        <AvatarFallback style={{ backgroundColor: `${DISCORD_COLOR}20` }}>
                          <DiscordIcon className="h-3 w-3" style={{ color: DISCORD_COLOR }} />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{connection.globalName || connection.username}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          @{connection.username}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={connection.isActive}
                        onCheckedChange={(checked) => toggleActive(connection.id, checked)}
                      />
                      <Badge variant={connection.isActive ? 'default' : 'secondary'}>
                        {connection.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(connection)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://discord.com/users/${connection.discordId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Discord
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setPendingDisconnect(connection.id);
                            setShowDisconnectDialog(true);
                          }}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Force Disconnect
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discord Connection Details</DialogTitle>
          </DialogHeader>
          {selectedConnection && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getDiscordAvatarUrl(selectedConnection.discordId, selectedConnection.avatarHash) || undefined} />
                  <AvatarFallback style={{ backgroundColor: `${DISCORD_COLOR}20` }}>
                    <DiscordIcon className="h-8 w-8" style={{ color: DISCORD_COLOR }} />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">
                    {selectedConnection.globalName || selectedConnection.username}
                  </p>
                  <p className="text-muted-foreground">@{selectedConnection.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Discord ID</p>
                  <p className="font-mono">{selectedConnection.discordId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">FGN User</p>
                  <p>{selectedConnection.profile?.username || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Connected</p>
                  <p>{new Date(selectedConnection.connectedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Synced</p>
                  <p>
                    {selectedConnection.lastSyncedAt
                      ? new Date(selectedConnection.lastSyncedAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {selectedConnection.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Disconnect Discord?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Discord connection for this user. They will need to re-authorize 
              their Discord account to reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDisconnect(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisconnect}
              className="bg-destructive hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
