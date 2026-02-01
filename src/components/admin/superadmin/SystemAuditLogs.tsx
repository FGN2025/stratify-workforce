import { useState, useMemo } from 'react';
import { useAuditLogs, type AuditLog } from '@/hooks/useAuditLogs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { RefreshCw, Activity, User, Shield, Trash, Settings, Loader2, Filter, X } from 'lucide-react';
import { formatDistanceToNow, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';

const actionIcons: Record<string, React.ReactNode> = {
  role_change: <Shield className="h-4 w-4 text-amber-400" />,
  delete: <Trash className="h-4 w-4 text-destructive" />,
  create: <Activity className="h-4 w-4 text-emerald-400" />,
  created: <Activity className="h-4 w-4 text-emerald-400" />,
  update: <Settings className="h-4 w-4 text-blue-400" />,
  updated: <Settings className="h-4 w-4 text-blue-400" />,
  bulk_delete: <Trash className="h-4 w-4 text-destructive" />,
  bulk_activate: <Activity className="h-4 w-4 text-emerald-400" />,
  bulk_deactivate: <Settings className="h-4 w-4 text-amber-400" />,
  redeemed: <Activity className="h-4 w-4 text-blue-400" />,
};

const actionColors: Record<string, string> = {
  role_change: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  delete: 'bg-destructive/20 text-destructive border-destructive/30',
  create: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  created: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  updated: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  bulk_delete: 'bg-destructive/20 text-destructive border-destructive/30',
  bulk_activate: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  bulk_deactivate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  redeemed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function SystemAuditLogs() {
  const { logs, isLoading, refetch, newLogIds } = useAuditLogs();
  
  // Filter states
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Extract unique actions and resource types from logs
  const uniqueActions = useMemo(() => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  }, [logs]);

  const uniqueResourceTypes = useMemo(() => {
    const types = [...new Set(logs.map(log => log.resource_type))];
    return types.sort();
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Resource type filter
      if (resourceFilter !== 'all' && log.resource_type !== resourceFilter) {
        return false;
      }

      // Date range filter
      const logDate = parseISO(log.created_at);
      
      if (startDate) {
        const start = startOfDay(parseISO(startDate));
        if (isBefore(logDate, start)) {
          return false;
        }
      }

      if (endDate) {
        const end = endOfDay(parseISO(endDate));
        if (isAfter(logDate, end)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, actionFilter, resourceFilter, startDate, endDate]);

  const hasActiveFilters = actionFilter !== 'all' || resourceFilter !== 'all' || startDate || endDate;

  const clearFilters = () => {
    setActionFilter('all');
    setResourceFilter('all');
    setStartDate('');
    setEndDate('');
  };

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
          Deleted {String(details.count || 0)} {String(details.type || 'codes')}
        </span>
      );
    }

    if (log.action === 'bulk_activate' || log.action === 'bulk_deactivate') {
      const actionVerb = log.action === 'bulk_activate' ? 'Activated' : 'Deactivated';
      return (
        <span className="text-xs text-muted-foreground">
          {actionVerb} {String(details.count || 0)} codes
        </span>
      );
    }

    if (log.action === 'redeemed') {
      return (
        <span className="text-xs text-muted-foreground">
          Code redeemed
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

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Resource Type</Label>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {uniqueResourceTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} logs
        {hasActiveFilters && ' (filtered)'}
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
            {filteredLogs.map((log) => (
              <TableRow 
                key={log.id}
                className={newLogIds.has(log.id) ? 'animate-fade-in bg-primary/10 transition-colors duration-1000' : ''}
              >
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
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters 
                    ? 'No logs match the current filters.'
                    : 'No audit logs yet. Actions will be recorded here.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
