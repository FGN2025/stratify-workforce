import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ImageField } from './ImageField';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, X } from 'lucide-react';

const STATUSES = ['live', 'preview', 'coming_soon', 'hidden'] as const;
const LAUNCH = ['subdomain', 'external', 'in_academy'] as const;
const ACCESS = ['open', 'sign_in', 'organization_invite'] as const;
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Platform-admin editor for disciplines, applications and their links. */
export function MarketplaceCatalogManager() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace', session?.access_token],
    enabled: !!session?.access_token,
    queryFn: async () => {
      const [d, a, l] = await Promise.all([
        supabase.from('disciplines').select('*').order('sort_order'),
        supabase.from('applications').select('*').order('sort_order'),
        supabase.from('application_disciplines').select('*'),
      ]);
      if (d.error || a.error || l.error) throw d.error ?? a.error ?? l.error;
      return { disciplines: d.data, applications: a.data, links: l.data };
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-marketplace'] });
    qc.invalidateQueries({ queryKey: ['marketplace-registry'] });
  };
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) toast({ title: 'Not saved', description: error.message, variant: 'destructive' });
    else { toast({ title: ok }); refresh(); }
  };

  const [newDisc, setNewDisc] = useState('');
  const [newApp, setNewApp] = useState({ name: '', launch_type: 'subdomain', launch_url: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ hero_image_url: '', tagline: '', description: '', accent_color: '' });

  const beginEdit = (app: typeof data.applications[number]) => {
    setEditingId(app.id);
    setDraft({
      hero_image_url: app.hero_image_url ?? '',
      tagline: app.tagline ?? '',
      description: app.description ?? '',
      accent_color: app.accent_color ?? '',
    });
  };

  const saveIdentity = (appId: string) => {
    void run(supabase.from('applications').update({
      hero_image_url: draft.hero_image_url || null,
      tagline: draft.tagline || null,
      description: draft.description || null,
      accent_color: draft.accent_color || null,
    }).eq('id', appId), 'App identity saved');
    setEditingId(null);
  };

  if (isLoading || !data) return <p className="text-muted-foreground">Loading catalog…</p>;
  const linked = (appId: string, discId: string) => data.links.some((x) => x.application_id === appId && x.discipline_id === discId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Disciplines</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.disciplines.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
              <span className="min-w-48 font-medium">{d.name}</span>
              <Select value={d.status} onValueChange={(v) => run(supabase.from('disciplines').update({ status: v }).eq('id', d.id), 'Status saved')}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={d.featured} onCheckedChange={(v) => run(supabase.from('disciplines').update({ featured: v }).eq('id', d.id), 'Saved')} /> Featured
              </label>
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newDisc.trim()) return;
              run(supabase.from('disciplines').insert({ key: slug(newDisc), name: newDisc.trim(), status: 'hidden' }), 'Discipline added (hidden until you set a status)');
              setNewDisc('');
            }}
          >
            <Input placeholder="New discipline name" value={newDisc} onChange={(e) => setNewDisc(e.target.value)} />
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {data.applications.map((a) => (
            <div key={a.id} className="space-y-3 border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-48 font-medium">{a.name}</span>
                <Badge variant="outline">{a.launch_type.replace('_', ' ')}</Badge>
                {a.launch_url && <span className="font-data text-xs text-muted-foreground">{a.launch_url}</span>}
                <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => editingId === a.id ? setEditingId(null) : beginEdit(a)}>
                  {editingId === a.id ? <X className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />}
                  {editingId === a.id ? 'Close identity' : 'Edit identity'}
                </Button>
              </div>
              {editingId === a.id && (
                <div className="grid gap-5 rounded-lg border border-border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="space-y-4">
                    <ImageField value={draft.hero_image_url} onChange={(hero_image_url) => setDraft((current) => ({ ...current, hero_image_url }))} label="App cover" variant="cover" folder="marketplace" />
                    <div><label className="mb-2 block text-sm font-medium">Tagline</label><Input value={draft.tagline} onChange={(e) => setDraft((current) => ({ ...current, tagline: e.target.value }))} /></div>
                    <div><label className="mb-2 block text-sm font-medium">Description</label><Textarea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} rows={4} /></div>
                    <div><label className="mb-2 block text-sm font-medium">Accent color</label><Input value={draft.accent_color} onChange={(e) => setDraft((current) => ({ ...current, accent_color: e.target.value }))} placeholder="#F59E0B" /></div>
                    <Button type="button" onClick={() => saveIdentity(a.id)}><Save className="mr-2 h-4 w-4" /> Save identity</Button>
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Card preview</p>
                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                      <div className="aspect-video bg-muted">{draft.hero_image_url && <img src={draft.hero_image_url} alt="" className="h-full w-full object-cover" />}</div>
                      <div className="p-4" style={{ borderTop: draft.accent_color ? `3px solid ${draft.accent_color}` : undefined }}>
                        <p className="font-display text-xl font-semibold">{a.name}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{draft.tagline || 'Add a concise purpose for this app.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={a.status} onValueChange={(v) => run(supabase.from('applications').update({ status: v }).eq('id', a.id), 'Status saved')}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={a.access_terms} onValueChange={(v) => run(supabase.from('applications').update({ access_terms: v }).eq('id', a.id), 'Access saved')}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCESS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={a.featured} onCheckedChange={(v) => run(supabase.from('applications').update({ featured: v }).eq('id', a.id), 'Saved')} /> Featured
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.disciplines.map((d) => {
                  const on = linked(a.id, d.id);
                  return (
                    <Button
                      key={d.id}
                      size="sm"
                      variant={on ? 'default' : 'outline'}
                      onClick={() => run(
                        on
                          ? supabase.from('application_disciplines').delete().eq('application_id', a.id).eq('discipline_id', d.id)
                          : supabase.from('application_disciplines').insert({ application_id: a.id, discipline_id: d.id }),
                        on ? 'Removed from discipline' : 'Added to discipline',
                      )}
                    >{d.name}</Button>
                  );
                })}
              </div>
            </div>
          ))}
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newApp.name.trim()) return;
              run(supabase.from('applications').insert({
                key: slug(newApp.name), name: newApp.name.trim(), launch_type: newApp.launch_type,
                launch_url: newApp.launch_url.trim() || null, status: 'hidden',
              }), 'App added (hidden until you set a status)');
              setNewApp({ name: '', launch_type: 'subdomain', launch_url: '' });
            }}
          >
            <Input className="w-56" placeholder="New app name" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })} />
            <Select value={newApp.launch_type} onValueChange={(v) => setNewApp({ ...newApp, launch_type: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{LAUNCH.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="w-72" placeholder="https://name.fgn.academy" value={newApp.launch_url} onChange={(e) => setNewApp({ ...newApp, launch_url: e.target.value })} />
            <Button type="submit">Add app</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
