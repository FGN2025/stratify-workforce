import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  resourceType: string;
  action: string;
  resourceId?: string;
  details?: Json;
}

export function useAuditLog() {
  const logAction = async ({ resourceType, action, resourceId, details }: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('system_audit_logs').insert([{
        resource_type: resourceType,
        action,
        resource_id: resourceId ?? null,
        actor_id: user?.id ?? null,
        details: details ?? null,
      }]);
    } catch (error) {
      // Silent fail for audit logging - don't block main operations
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
}

// Standalone function for use outside React components
export async function logAuditAction({ resourceType, action, resourceId, details }: AuditLogEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('system_audit_logs').insert([{
      resource_type: resourceType,
      action,
      resource_id: resourceId ?? null,
      actor_id: user?.id ?? null,
      details: details ?? null,
    }]);
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
