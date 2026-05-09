import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Link2, RefreshCw, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useBreakroomSyncAttempts,
  useWorkOrderOptions,
  useMapAndResync,
  useResetAttempt,
  useTriggerPoll,
  type BreakroomSyncAttempt,
} from '@/hooks/useBreakroomMapper';

const outcomeBadge = (outcome: BreakroomSyncAttempt['sync_outcome']) => {
  switch (outcome) {
    case 'completed':
      return <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">completed</Badge>;
    case 'no_matching_work_order':
      return <Badge variant="outline" className="border-amber-500/40 text-amber-400">unmapped</Badge>;
    case 'sync_error':
      return <Badge variant="outline" className="border-rose-500/40 text-rose-400">sync error</Badge>;
  }
};

export function BreakroomMapperManager() {
  const attempts = useBreakroomSyncAttempts();
  const workOrders = useWorkOrderOptions();
  const mapAndResync = useMapAndResync();
  const resetAttempt = useResetAttempt();
  const triggerPoll = useTriggerPoll();

  const [filter, setFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | BreakroomSyncAttempt['sync_outcome']>(
    'no_matching_work_order'
  );
  const [dialog, setDialog] = useState<{ open: boolean; attempt: BreakroomSyncAttempt | null }>({
    open: false,
    attempt: null,
  });
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('none');

  const rows = useMemo(() => {
    const list = attempts.data ?? [];
    return list.filter(r => {
      if (outcomeFilter !== 'all' && r.sync_outcome !== outcomeFilter) return false;
      if (!filter.trim()) return true;
      const f = filter.trim().toLowerCase();
      return (
        (r.metadata?.quiz_name ?? '').toLowerCase().includes(f) ||
        (r.metadata?.breakroom_course_name ?? '').toLowerCase().includes(f) ||
        (r.fgn_username ?? '').toLowerCase().includes(f) ||
        String(r.breakroom_quiz_id).includes(f)
      );
    });
  }, [attempts.data, filter, outcomeFilter]);

  const openMap = (attempt: BreakroomSyncAttempt) => {
    setDialog({ open: true, attempt });
    setSelectedWorkOrderId('none');
  };

  const closeMap = () => {
    setDialog({ open: false, attempt: null });
    setSelectedWorkOrderId('none');
  };

  const handleConfirmMap = async () => {
    if (!dialog.attempt) return;
    if (selectedWorkOrderId === 'none') {
      toast({ title: 'Pick a work order first', variant: 'destructive' });
      return;
    }
    try {
      const result = await mapAndResync.mutateAsync({
        attempt: dialog.attempt,
        workOrderId: selectedWorkOrderId,
      });
      const r = result.results as Record<string, number>;
      toast({
        title: 'Mapped & polled',
        description: `synced: ${r.synced ?? 0} · skipped_unmapped: ${r.skipped_unmapped ?? 0} · already_synced: ${r.already_synced ?? 0}`,
      });
      closeMap();
    } catch (e) {
      toast({
        title: 'Map & resync failed',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    }
  };

  const handleReset = async (row: BreakroomSyncAttempt) => {
    if (!confirm(`Reset attempt for "${row.metadata?.quiz_name ?? row.breakroom_quiz_id}"? Next poll will retry it.`)) {
      return;
    }
    try {
      await resetAttempt.mutateAsync(row.id);
      toast({ title: 'Attempt reset', description: 'Next poll will retry this quiz.' });
    } catch (e) {
      toast({ title: 'Reset failed', description: String(e), variant: 'destructive' });
    }
  };

  const handlePollNow = async () => {
    try {
      const result = await triggerPoll.mutateAsync();
      const r = result.results as Record<string, number>;
      toast({
        title: 'Poll complete',
        description: `students: ${r.students_found ?? 0} · synced: ${r.synced ?? 0} · skipped_unmapped: ${r.skipped_unmapped ?? 0}`,
      });
    } catch (e) {
      toast({ title: 'Poll failed', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-wide flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Breakroom → Work Order Mapper
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every poll cycle records an attempt row keyed on (quiz × Breakroom user). Map an unmapped
            quiz to a work order to set its <code className="text-xs">metadata.breakroom_course_name</code>,
            reset the attempt, and trigger an immediate resync.
          </p>
        </div>
        <Button onClick={handlePollNow} disabled={triggerPoll.isPending} variant="outline">
          {triggerPoll.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Poll now
        </Button>
      </header>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="Filter by quiz, course, user…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="max-w-xs"
          />
          <Select value={outcomeFilter} onValueChange={v => setOutcomeFilter(v as typeof outcomeFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="no_matching_work_order">Unmapped</SelectItem>
              <SelectItem value="sync_error">Sync errors</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {rows.length} of {attempts.data?.length ?? 0} attempts
          </span>
        </div>

        {attempts.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading attempts…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            No attempts match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3">Quiz</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Outcome</th>
                  <th className="py-2 pr-3">Last attempt</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{row.metadata?.quiz_name ?? `Quiz #${row.breakroom_quiz_id}`}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        #{row.breakroom_quiz_id}
                        {row.metadata?.breakroom_course_name && ` · ${row.metadata.breakroom_course_name}`}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div>{row.fgn_username ?? <span className="text-muted-foreground">unknown</span>}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        breakroom #{row.breakroom_user_id}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{outcomeBadge(row.sync_outcome)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {new Date(row.last_attempt_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right space-x-2 whitespace-nowrap">
                      {row.sync_outcome !== 'completed' && (
                        <Button size="sm" onClick={() => openMap(row)}>
                          <Link2 className="h-3.5 w-3.5 mr-1" /> Map
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReset(row)}
                        disabled={resetAttempt.isPending}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialog.open} onOpenChange={open => !open && closeMap()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Map quiz to work order</DialogTitle>
            <DialogDescription>
              This sets the work order&apos;s <code className="text-xs">metadata.breakroom_course_name</code>,
              deletes the attempt row, and immediately invokes the poll function.
            </DialogDescription>
          </DialogHeader>

          {dialog.attempt && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border/60 p-3 bg-muted/20 space-y-1">
                <div className="font-medium">{dialog.attempt.metadata?.quiz_name ?? `Quiz #${dialog.attempt.breakroom_quiz_id}`}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Breakroom quiz #{dialog.attempt.breakroom_quiz_id}
                  {' · '}user #{dialog.attempt.breakroom_user_id}
                  {dialog.attempt.fgn_username && ` (${dialog.attempt.fgn_username})`}
                </div>
                {dialog.attempt.metadata?.breakroom_course_name && (
                  <div className="text-xs text-muted-foreground">
                    Course: {dialog.attempt.metadata.breakroom_course_name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Work order
                </label>
                <Select value={selectedWorkOrderId} onValueChange={setSelectedWorkOrderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a work order…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="none">— none selected —</SelectItem>
                    {(workOrders.data ?? []).map(wo => {
                      const meta = wo.metadata as Record<string, unknown> | null;
                      const existing = meta?.breakroom_course_name as string | undefined;
                      return (
                        <SelectItem key={wo.id} value={wo.id}>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{wo.title}</span>
                            {wo.game_title && (
                              <Badge variant="outline" className="text-[10px]">
                                {String(wo.game_title)}
                              </Badge>
                            )}
                            {existing && (
                              <span className="text-xs text-amber-400">
                                (will overwrite: {existing})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkOrderId !== 'none' && (() => {
                const wo = workOrders.data?.find(w => w.id === selectedWorkOrderId);
                const existing = (wo?.metadata as Record<string, unknown> | null)?.breakroom_course_name;
                if (existing) {
                  return (
                    <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-md p-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        This work order is already mapped to <strong>{String(existing)}</strong>.
                        Mapping again will overwrite that.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeMap} disabled={mapAndResync.isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMap} disabled={mapAndResync.isPending || selectedWorkOrderId === 'none'}>
              {mapAndResync.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Map & resync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
