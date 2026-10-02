import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  userId: string;
}

/** Work Order steps a reviewer accepted. Supporting records, not credentials. */
export function ReviewedDemonstrations({ userId }: Props) {
  const { session } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ['reviewed-demonstrations', userId, session?.access_token],
    enabled: !!session?.access_token && !!userId,
    queryFn: async () => {
      const { data: demos, error } = await supabase
        .from('task_demonstrations')
        .select('id, task_id, work_order_id, review_completed_at')
        .eq('user_id', userId)
        .eq('status', 'demonstrated')
        .not('review_completed_at', 'is', null)
        .order('review_completed_at', { ascending: false });
      if (error) throw error;
      if (!demos?.length) return [];
      const [tasksRes, woRes] = await Promise.all([
        supabase.from('work_order_tasks').select('id, title').in('id', demos.map((d) => d.task_id)),
        supabase.from('work_orders').select('id, title').in('id', demos.map((d) => d.work_order_id)),
      ]);
      const t = new Map((tasksRes.data ?? []).map((r) => [r.id, r.title]));
      const w = new Map((woRes.data ?? []).map((r) => [r.id, r.title]));
      return demos.map((d) => ({
        ...d,
        taskTitle: t.get(d.task_id) ?? 'Work Order step',
        workOrderTitle: w.get(d.work_order_id) ?? 'Work Order',
      }));
    },
  });

  if (data.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold uppercase tracking-wide">Reviewed Demonstrations</h2>
          <p className="text-sm text-muted-foreground">
            Work Order steps a reviewer accepted against submitted evidence. These are supporting records, not certifications.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((d) => (
          <Link key={d.id} to={`/work-orders/${d.work_order_id}`} className="glass-card p-4 hover:border-primary/40 transition-colors">
            <p className="font-semibold break-words">{d.taskTitle}</p>
            <p className="text-sm text-muted-foreground break-words">{d.workOrderTitle}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Accepted {new Date(d.review_completed_at as string).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
