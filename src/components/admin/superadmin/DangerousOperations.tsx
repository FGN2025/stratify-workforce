import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Trash2, Users, Database, Loader2 } from 'lucide-react';

interface DangerousOperation {
  id: string;
  title: string;
  description: string;
  confirmText: string;
  icon: React.ReactNode;
  action: () => Promise<{ count: number; type: string }>;
}

export function DangerousOperations() {
  const { user } = useAuth();
  const [selectedOperation, setSelectedOperation] = useState<DangerousOperation | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const operations: DangerousOperation[] = [
    {
      id: 'purge-inactive-users',
      title: 'Purge Inactive User Data',
      description: 'Remove all user-related data (points, progress, completions) for users who have not logged in for 1 year. User accounts remain intact.',
      confirmText: 'PURGE INACTIVE',
      icon: <Users className="h-5 w-5" />,
      action: async () => {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Get inactive user IDs from profiles not updated in a year
        const { data: inactiveProfiles } = await supabase
          .from('profiles')
          .select('id')
          .lt('updated_at', oneYearAgo.toISOString());

        if (!inactiveProfiles?.length) {
          return { count: 0, type: 'users' };
        }

        const inactiveIds = inactiveProfiles.map(p => p.id);

        // Delete their data from various tables
        await supabase.from('user_points').delete().in('user_id', inactiveIds);
        await supabase.from('user_lesson_progress').delete().in('user_id', inactiveIds);
        await supabase.from('user_work_order_completions').delete().in('user_id', inactiveIds);
        await supabase.from('user_game_stats').delete().in('user_id', inactiveIds);

        return { count: inactiveIds.length, type: 'inactive user records' };
      },
    },
    {
      id: 'reset-all-progress',
      title: 'Reset All User Progress',
      description: 'Clear all lesson progress, course enrollments, and work order completions for ALL users. This cannot be undone.',
      confirmText: 'RESET ALL PROGRESS',
      icon: <Database className="h-5 w-5" />,
      action: async () => {
        const { count: progressCount } = await supabase
          .from('user_lesson_progress')
          .select('*', { count: 'exact', head: true });

        await supabase.from('user_lesson_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('user_course_enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('user_work_order_completions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        return { count: progressCount || 0, type: 'progress records' };
      },
    },
    {
      id: 'clear-audit-logs',
      title: 'Clear Audit Logs',
      description: 'Delete all system audit logs older than 90 days. Recent logs will be preserved.',
      confirmText: 'CLEAR OLD LOGS',
      icon: <Trash2 className="h-5 w-5" />,
      action: async () => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const { count } = await supabase
          .from('system_audit_logs')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', ninetyDaysAgo.toISOString());

        await supabase
          .from('system_audit_logs')
          .delete()
          .lt('created_at', ninetyDaysAgo.toISOString());

        return { count: count || 0, type: 'old audit logs' };
      },
    },
  ];

  const executeOperation = async () => {
    if (!selectedOperation || confirmInput !== selectedOperation.confirmText) {
      return;
    }

    setIsExecuting(true);
    try {
      const result = await selectedOperation.action();

      // Log the dangerous operation
      await supabase.from('system_audit_logs').insert({
        actor_id: user?.id,
        action: 'bulk_delete',
        resource_type: 'dangerous_operation',
        resource_id: selectedOperation.id,
        details: {
          operation: selectedOperation.title,
          count: result.count,
          type: result.type,
        },
      });

      toast({
        title: 'Operation Complete',
        description: `Deleted ${result.count} ${result.type}`,
      });
    } catch (error) {
      console.error('Error executing operation:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute operation',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
      setSelectedOperation(null);
      setConfirmInput('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-destructive">Dangerous Operations Zone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These operations are irreversible and affect system-wide data. Each action is logged 
            in the audit trail. Only proceed if you fully understand the consequences.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {operations.map((op) => (
          <Card key={op.id} className="border-destructive/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
                  {op.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{op.title}</CardTitle>
                  <CardDescription>{op.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setSelectedOperation(op)}
              >
                Execute Operation
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!selectedOperation} onOpenChange={() => setSelectedOperation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Dangerous Operation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to execute: <strong>{selectedOperation?.title}</strong>
              </p>
              <p>This action is <strong>irreversible</strong> and will be logged.</p>
              <div className="space-y-2">
                <Label>
                  Type <code className="text-destructive">{selectedOperation?.confirmText}</code> to confirm:
                </Label>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type confirmation text..."
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmInput('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeOperation}
              disabled={confirmInput !== selectedOperation?.confirmText || isExecuting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Execute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
