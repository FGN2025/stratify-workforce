import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Pencil, Plus, GraduationCap, ExternalLink, Loader2 } from 'lucide-react';

interface CareerPath {
  id: string;
  min_readiness_pct: number;
  training_bridge_url: string | null;
  training_bridge_label: string | null;
  created_at: string;
  updated_at: string;
}

export function CareerPathsManager() {
  const queryClient = useQueryClient();
  const [editingPath, setEditingPath] = useState<CareerPath | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    id: '',
    min_readiness_pct: 75,
    training_bridge_url: '',
    training_bridge_label: '',
  });

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ['career-paths-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .order('id');
      if (error) throw error;
      return data as CareerPath[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        id: values.id,
        min_readiness_pct: values.min_readiness_pct,
        training_bridge_url: values.training_bridge_url || null,
        training_bridge_label: values.training_bridge_label || null,
        updated_at: new Date().toISOString(),
      };

      if (editingPath) {
        const { error } = await supabase
          .from('career_paths')
          .update(payload)
          .eq('id', editingPath.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('career_paths')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths-admin'] });
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
      toast({ title: editingPath ? 'Career path updated' : 'Career path created' });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openEdit = (path: CareerPath) => {
    setEditingPath(path);
    setForm({
      id: path.id,
      min_readiness_pct: path.min_readiness_pct,
      training_bridge_url: path.training_bridge_url || '',
      training_bridge_label: path.training_bridge_label || '',
    });
  };

  const openCreate = () => {
    setIsCreating(true);
    setEditingPath(null);
    setForm({ id: '', min_readiness_pct: 75, training_bridge_url: '', training_bridge_label: '' });
  };

  const closeDialog = () => {
    setEditingPath(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!form.id.trim()) {
      toast({ title: 'ID is required', variant: 'destructive' });
      return;
    }
    saveMutation.mutate(form);
  };

  const dialogOpen = !!editingPath || isCreating;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Skills Path Thresholds</h3>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Path
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure the minimum readiness percentage required before a user is flagged as "Ready to Advance" for each career path. Users below the threshold will see recommended training links.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : paths.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No career paths configured yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Career Path ID</TableHead>
              <TableHead>Min Readiness %</TableHead>
              <TableHead>Training Bridge</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paths.map((path) => (
              <TableRow key={path.id}>
                <TableCell className="font-mono text-sm">{path.id}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {path.min_readiness_pct}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {path.training_bridge_url ? (
                    <a
                      href={path.training_bridge_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {path.training_bridge_label || path.training_bridge_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(path)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPath ? 'Edit Career Path' : 'Add Career Path'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="path-id">Path ID</Label>
              <Input
                id="path-id"
                placeholder="e.g. cdl-class-a"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                disabled={!!editingPath}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-pct">Minimum Readiness Threshold (%)</Label>
              <Input
                id="min-pct"
                type="number"
                min={0}
                max={100}
                value={form.min_readiness_pct}
                onChange={(e) => setForm({ ...form, min_readiness_pct: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Users must reach this percentage to be flagged as "Ready to Advance."
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bridge-url">Training Bridge URL</Label>
              <Input
                id="bridge-url"
                placeholder="https://broadbandworkforce.com"
                value={form.training_bridge_url}
                onChange={(e) => setForm({ ...form, training_bridge_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bridge-label">Training Bridge Label</Label>
              <Input
                id="bridge-label"
                placeholder="e.g. Broadband Workforce Training"
                value={form.training_bridge_label}
                onChange={(e) => setForm({ ...form, training_bridge_label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingPath ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
