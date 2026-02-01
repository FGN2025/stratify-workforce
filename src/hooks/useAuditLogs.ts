import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
  actor_username?: string;
}

export function useAuditLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch actor usernames
      const actorIds = [...new Set(data?.map(l => l.actor_id).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', actorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      const enrichedLogs: AuditLog[] = (data || []).map(log => ({
        id: log.id,
        actor_id: log.actor_id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: log.details,
        ip_address: log.ip_address,
        created_at: log.created_at,
        actor_username: log.actor_id ? profileMap.get(log.actor_id) || 'Unknown' : 'System',
      }));

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch username for a single actor
  const fetchActorUsername = useCallback(async (actorId: string | null): Promise<string> => {
    if (!actorId) return 'System';
    
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .single();
    
    return data?.username || 'Unknown';
  }, []);

  // Clear highlight from a specific log after animation completes
  const clearNewLogHighlight = useCallback((logId: string) => {
    setNewLogIds(prev => {
      const next = new Set(prev);
      next.delete(logId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchLogs();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_audit_logs',
        },
        async (payload) => {
          const newLog = payload.new as AuditLog;
          const actorUsername = await fetchActorUsername(newLog.actor_id);
          
          const enrichedLog: AuditLog = {
            ...newLog,
            actor_username: actorUsername,
          };

          // Mark this log as new for highlighting
          setNewLogIds(prev => new Set(prev).add(enrichedLog.id));

          // Add new log to the top of the list
          setLogs((prev) => [enrichedLog, ...prev.slice(0, 99)]);

          // Remove highlight after 3 seconds
          setTimeout(() => {
            clearNewLogHighlight(enrichedLog.id);
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLogs, fetchActorUsername, clearNewLogHighlight]);

  const logAction = async (
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Json
  ) => {
    if (!user) return;

    try {
      await supabase.from('system_audit_logs').insert([{
        actor_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        details: details || null,
      }]);
      // No need to refetch - realtime will handle it
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  return { logs, isLoading, refetch: fetchLogs, logAction, newLogIds };
}
