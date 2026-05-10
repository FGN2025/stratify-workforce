import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Track {
  id: string;
  track_key: string;
  name: string;
  description: string | null;
  gate_mode: 'all_completed' | 'per_challenge';
  course_id: string | null;
  lesson_id: string | null;
  accent_color: string;
  icon_name: string;
  is_active: boolean;
}

interface Membership {
  id: string;
  track_id: string;
  challenge_id: string;
  notes: string | null;
}

export function ChallengeTrackMembershipManager() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [trackDialog, setTrackDialog] = useState<{ open: boolean; editing: Track | null }>({ open: false, editing: null });
  const [memberDialog, setMemberDialog] = useState<{ open: boolean; trackId: string | null; editing: Membership | null }>({ open: false, trackId: null, editing: null });

  const tracksQ = useQuery({
    queryKey: ['admin-challenge-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('challenge_tracks').select('*').order('name');
      if (error) throw error;
      return data as Track[];
    },
  });

  const membersQ = useQuery({
    queryKey: ['admin-challenge-track-memberships'],
    queryFn: async () => {
      const { data, error } = await supabase.from('challenge_track_membership').select('*').order('challenge_id');
      if (error) throw error;
      return data as Membership[];
    },
  });

  const saveTrack = useMutation({
    mutationFn: async (t: Partial<Track>) => {
      if (t.id) {
        const { error } = await supabase.from('challenge_tracks').update(t).eq('id', t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('challenge_tracks').insert(t as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-challenge-tracks'] });
      toast({ title: 'Track saved' });
      setTrackDialog({ open: false, editing: null });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const removeTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenge_tracks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-challenge-tracks'] });
      qc.invalidateQueries({ queryKey: ['admin-challenge-track-memberships'] });
      toast({ title: 'Track deleted' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  const saveMember = useMutation({
    mutationFn: async (m: Partial<Membership>) => {
      if (m.id) {
        const { error } = await supabase.from('challenge_track_membership').update(m).eq('id', m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('challenge_track_membership').insert(m as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-challenge-track-memberships'] });
      toast({ title: 'Membership saved' });
      setMemberDialog({ open: false, trackId: null, editing: null });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('challenge_track_membership').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-challenge-track-memberships'] });
      toast({ title: 'Removed from track' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });

  if (tracksQ.isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const tracks = tracksQ.data ?? [];
  const members = membersQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Challenge Tracks</h2>
          <p className="text-sm text-muted-foreground">
            Group play.fgn.gg challenges into tracks that trigger knowledge checks on completion.
          </p>
        </div>
        <Button onClick={() => setTrackDialog({ open: true, editing: null })}>
          <Plus className="h-4 w-4 mr-2" /> New Track
        </Button>
      </div>

      <div className="space-y-3">
        {tracks.map((t) => {
          const trackMembers = members.filter((m) => m.track_id === t.id);
          const isOpen = expanded[t.id] ?? false;
          return (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => setExpanded((s) => ({ ...s, [t.id]: !isOpen }))}
                  className="flex items-start gap-2 text-left flex-1"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 mt-1" /> : <ChevronRight className="h-4 w-4 mt-1" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-xs">{t.track_key}</Badge>
                      <Badge className="text-xs" style={{ backgroundColor: t.accent_color }}>{t.gate_mode}</Badge>
                      {!t.is_active && <Badge variant="secondary" className="text-xs">inactive</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {trackMembers.length} challenge{trackMembers.length === 1 ? '' : 's'}
                      {t.course_id && ` · course ${t.course_id.slice(0, 8)}…`}
                      {t.lesson_id && ` · lesson ${t.lesson_id.slice(0, 8)}…`}
                    </div>
                  </div>
                </button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setTrackDialog({ open: true, editing: t })}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm(`Delete track "${t.name}" and all its memberships?`) && removeTrack.mutate(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 pl-6 space-y-2 border-l">
                  {trackMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <code className="font-mono text-xs">{m.challenge_id}</code>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setMemberDialog({ open: true, trackId: t.id, editing: m })}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => confirm('Remove this challenge from track?') && removeMember.mutate(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setMemberDialog({ open: true, trackId: t.id, editing: null })}>
                    <Plus className="h-3 w-3 mr-1" /> Add Challenge
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
        {tracks.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No tracks yet.</Card>
        )}
      </div>

      <TrackDialog state={trackDialog} onClose={() => setTrackDialog({ open: false, editing: null })} onSave={(t) => saveTrack.mutate(t)} saving={saveTrack.isPending} />
      <MemberDialog state={memberDialog} onClose={() => setMemberDialog({ open: false, trackId: null, editing: null })} onSave={(m) => saveMember.mutate(m)} saving={saveMember.isPending} />
    </div>
  );
}

function TrackDialog({ state, onClose, onSave, saving }: {
  state: { open: boolean; editing: Track | null };
  onClose: () => void;
  onSave: (t: Partial<Track>) => void;
  saving: boolean;
}) {
  const e = state.editing;
  const [form, setForm] = useState<Partial<Track>>({});
  // reset form when dialog opens
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (state.open && openedFor !== (e?.id ?? 'new')) {
    setOpenedFor(e?.id ?? 'new');
    setForm(e ?? {
      track_key: '', name: '', gate_mode: 'per_challenge',
      accent_color: '#6366f1', icon_name: 'graduation-cap', is_active: true,
    });
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && (onClose(), setOpenedFor(null))}>
      <DialogContent>
        <DialogHeader><DialogTitle>{e ? 'Edit Track' : 'New Track'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Track Key</Label>
            <Input value={form.track_key ?? ''} onChange={(ev) => setForm({ ...form, track_key: ev.target.value })} placeholder="e.g. fiber_optics_construction" />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={form.name ?? ''} onChange={(ev) => setForm({ ...form, name: ev.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description ?? ''} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
          </div>
          <div>
            <Label>Gate Mode</Label>
            <Select value={form.gate_mode ?? 'per_challenge'} onValueChange={(v) => setForm({ ...form, gate_mode: v as Track['gate_mode'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_challenge">Per challenge (fire on each completion)</SelectItem>
                <SelectItem value="all_completed">All completed (fire when all done)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Course ID</Label>
              <Input value={form.course_id ?? ''} onChange={(ev) => setForm({ ...form, course_id: ev.target.value || null })} placeholder="uuid" />
            </div>
            <div>
              <Label>Lesson ID (all_completed only)</Label>
              <Input value={form.lesson_id ?? ''} onChange={(ev) => setForm({ ...form, lesson_id: ev.target.value || null })} placeholder="uuid" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Accent Color</Label>
              <Input value={form.accent_color ?? ''} onChange={(ev) => setForm({ ...form, accent_color: ev.target.value })} />
            </div>
            <div>
              <Label>Icon Name</Label>
              <Input value={form.icon_name ?? ''} onChange={(ev) => setForm({ ...form, icon_name: ev.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setOpenedFor(null); }}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.track_key || !form.name}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberDialog({ state, onClose, onSave, saving }: {
  state: { open: boolean; trackId: string | null; editing: Membership | null };
  onClose: () => void;
  onSave: (m: Partial<Membership>) => void;
  saving: boolean;
}) {
  const e = state.editing;
  const [form, setForm] = useState<Partial<Membership>>({});
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (state.open && openedFor !== (e?.id ?? `new-${state.trackId}`)) {
    setOpenedFor(e?.id ?? `new-${state.trackId}`);
    setForm(e ?? { track_id: state.trackId ?? undefined, challenge_id: '', notes: null });
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && (onClose(), setOpenedFor(null))}>
      <DialogContent>
        <DialogHeader><DialogTitle>{e ? 'Edit Membership' : 'Add Challenge to Track'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Challenge ID</Label>
            <Input
              value={form.challenge_id ?? ''}
              onChange={(ev) => setForm({ ...form, challenge_id: ev.target.value })}
              placeholder="play.fgn.gg challenge UUID"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ''} onChange={(ev) => setForm({ ...form, notes: ev.target.value || null })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setOpenedFor(null); }}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.challenge_id || !form.track_id}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
