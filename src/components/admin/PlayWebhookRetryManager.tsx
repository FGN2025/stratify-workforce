import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Attempt {
  id: string;
  action: string;
  status: string;
  external_attempt_id: string | null;
  error: string | null;
  request: any;
  response: any;
  created_at: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

function extractIdentity(req: any): { email?: string; ext?: string; challengeId?: string; title?: string } {
  const inner = req?.payload?.payload ?? req?.payload?.data ?? req?.payload ?? {};
  const user = inner?.user ?? {};
  return {
    email: user.email ?? inner.user_email ?? undefined,
    ext: user.external_user_id ?? inner.external_user_id ?? undefined,
    challengeId:
      inner.challenge_id ?? inner.challenge?.id ?? inner.fgn_origin_challenge_id ?? undefined,
    title: inner.challenge?.title ?? inner.title ?? inner.name ?? undefined,
  };
}

export function PlayWebhookRetryManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'failed' | 'all'>('failed');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Totals (failed + all) regardless of current filter
  const { data: totals } = useQuery({
    queryKey: ['play-sync-attempts-totals'],
    queryFn: async () => {
      const [{ count: total }, { count: failed }] = await Promise.all([
        supabase
          .from('play_sync_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('direction', 'inbound'),
        supabase
          .from('play_sync_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('direction', 'inbound')
          .eq('status', 'failed'),
      ]);
      return { total: total ?? 0, failed: failed ?? 0 };
    },
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['play-sync-attempts', statusFilter, page, pageSize],
    queryFn: async () => {
      let q = supabase
        .from('play_sync_attempts')
        .select('id, action, status, external_attempt_id, error, request, response, created_at', { count: 'exact' })
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (statusFilter === 'failed') q = q.eq('status', 'failed');
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Attempt[], count: count ?? 0 };
    },
  });

  const attempts = data?.rows ?? [];
  const filteredCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return attempts;
    return attempts.filter((a) => {
      const id = extractIdentity(a.request);
      const hay = [
        a.action, a.id, a.external_attempt_id, a.error,
        id.email, id.ext, id.challengeId, id.title,
        JSON.stringify(a.response ?? ''),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [attempts, search]);

  const retry = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke('replay-play-attempt', {
        body: { attempt_ids: ids },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const results = data?.results ?? [];
      const ok = results.filter((r: any) => r.ok).length;
      const fail = results.length - ok;
      toast({
        title: 'Replay complete',
        description: `${ok} succeeded, ${fail} failed`,
        variant: fail > 0 ? 'destructive' : 'default',
      });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['play-sync-attempts'] });
      qc.invalidateQueries({ queryKey: ['play-sync-attempts-totals'] });
    },
    onError: (err: any) => {
      toast({ title: 'Replay failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleRetry = async (ids: string[]) => {
    if (ids.length === 0) return;
    setRetrying(true);
    try { await retry.mutateAsync(ids); } finally { setRetrying(false); }
  };

  const toggleSel = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleExp = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };
  const toggleAllOnPage = () => {
    const ids = filtered.map((a) => a.id);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSelected(next);
  };

  const rangeStart = filteredCount === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(filteredCount, page * pageSize + filtered.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Play Webhook Replay</CardTitle>
        <CardDescription>
          Retry failed inbound webhook deliveries from play.fgn.gg. Filter by user email,
          external user id, challenge id, or work order title to target a specific passport
          or work order.
        </CardDescription>
        {totals && (
          <div className="flex gap-3 pt-2 text-xs">
            <Badge variant="destructive">{totals.failed} failed</Badge>
            <Badge variant="secondary">{totals.total} total inbound</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search current page (email, challenge, error)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button
            variant="outline" size="sm"
            onClick={() => { setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed'); setPage(0); }}
          >
            {statusFilter === 'failed' ? 'Showing: Failed only' : 'Showing: All'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { refetch(); }}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline" size="sm"
            disabled={filtered.length === 0}
            onClick={toggleAllOnPage}
          >
            {filtered.every((a) => selected.has(a.id)) && filtered.length > 0
              ? 'Deselect page' : 'Select page'}
          </Button>
          <Button
            disabled={selected.size === 0 || retrying}
            onClick={() => handleRetry(Array.from(selected))}
          >
            {retrying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
            Retry selected ({selected.size})
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No attempts found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const id = extractIdentity(a.request);
              const isOpen = expanded.has(a.id);
              return (
                <div key={a.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selected.has(a.id)}
                      onCheckedChange={() => toggleSel(a.id)}
                      className="mt-1"
                    />
                    <button onClick={() => toggleExp(a.id)} className="mt-1">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={a.status === 'failed' ? 'destructive' : 'secondary'}>
                          {a.status}
                        </Badge>
                        <code className="text-xs">{a.action}</code>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm mt-1 truncate">
                        {id.title && <span className="font-medium">{id.title} </span>}
                        {id.email && <span className="text-muted-foreground">· {id.email}</span>}
                        {id.challengeId && <span className="text-muted-foreground"> · {id.challengeId}</span>}
                      </div>
                      {a.error && (
                        <div className="text-xs text-destructive mt-1 truncate">{a.error}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retrying}
                      onClick={() => handleRetry([a.id])}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" /> Retry
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="grid gap-2 pl-9">
                      <details>
                        <summary className="text-xs cursor-pointer text-muted-foreground">Request payload</summary>
                        <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto max-h-64">
                          {JSON.stringify(a.request, null, 2)}
                        </pre>
                      </details>
                      {a.response && (
                        <details>
                          <summary className="text-xs cursor-pointer text-muted-foreground">Last response</summary>
                          <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto max-h-64">
                            {JSON.stringify(a.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rangeStart}–{rangeEnd}</span> of{' '}
            <span className="font-medium text-foreground">{filteredCount}</span>{' '}
            {statusFilter === 'failed' ? 'failed' : 'inbound'} attempts
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Per page:</span>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <Button
                key={n}
                size="sm"
                variant={pageSize === n ? 'default' : 'ghost'}
                onClick={() => { setPageSize(n); setPage(0); }}
                className="h-7 px-2"
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={() => setPage(0)} disabled={page === 0}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page + 1} / {totalPages}
            </span>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
