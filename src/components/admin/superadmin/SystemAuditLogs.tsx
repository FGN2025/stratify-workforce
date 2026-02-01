import { useAuditLogs, type AuditLog } from '@/hooks/useAuditLogs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Json } from '@/integrations/supabase/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead,
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Activity, User, Shield, Trash, Settings, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, React.ReactNode> = {
  role_change: <Shield className="h-4 w-4 text-amber-400" />,
  delete: <Trash className="h-4 w-4 text-destructive" />,
  create: <Activity className="h-4 w-4 text-emerald-400" />,
  update: <Settings className="h-4 w-4 text-blue-400" />,
  bulk_delete: <Trash className="h-4 w-4 text-destructive" />,
};

const actionColors: Record<string, string> = {
  role_change: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  delete: 'bg-destructive/20 text-destructive border-destructive/30',
  create: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  bulk_delete: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function SystemAuditLogs() {
  const { logs, isLoading, refetch } = useAuditLogs();

  const formatDetails = (log: AuditLog) => {
    if (!log.details) return null;
    
    const details = log.details as Record<string, Json>;
    
    if (log.action === 'role_change') {
      return (
        <span className="text-xs text-muted-foreground">
          {String(details.target_username || '')}: {String(details.old_role || 'none')} → {String(details.new_role || '')}
        </span>
      );
    }

    if (log.action === 'bulk_delete') {
      return (
        <span className="text-xs text-muted-foreground">
          Deleted {String(details.count || 0)} {String(details.type || '')}
        </span>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Audit Logs</h3>
          <p className="text-sm text-muted-foreground">
            View system-wide activity logs and security events
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[500px] rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{log.actor_username}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={actionColors[log.action] || ''}>
                    <span className="mr-1">{actionIcons[log.action] || <Activity className="h-4 w-4" />}</span>
                    {log.action.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {log.resource_type}
                    {log.resource_id && (
                      <span className="text-muted-foreground ml-1">({log.resource_id.slice(0, 8)}...)</span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{formatDetails(log)}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No audit logs yet. Actions will be recorded here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
