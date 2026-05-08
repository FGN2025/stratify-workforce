import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Link2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  useChallengeLessonMappings,
  useAllLessons,
  useChallengeOptions,
  type ChallengeLessonMappingWithJoin,
} from '@/hooks/useChallengeLessonMappings';

interface DialogState {
  open: boolean;
  editing: ChallengeLessonMappingWithJoin | null;
}

export function ChallengeLessonMappingsManager() {
  const { list, upsert, remove } = useChallengeLessonMappings();
  const lessons = useAllLessons();
  const challenges = useChallengeOptions();
  const [dialog, setDialog] = useState<DialogState>({ open: false, editing: null });

  const openCreate = () => setDialog({ open: true, editing: null });
  const openEdit = (row: ChallengeLessonMappingWithJoin) =>
    setDialog({ open: true, editing: row });
  const close = () => setDialog({ open: false, editing: null });

  const onDelete = async (row: ChallengeLessonMappingWithJoin) => {
    if (!confirm(`Delete mapping for challenge ${row.play_challenge_id.slice(0, 8)}…?`)) return;
    try {
      await remove.mutateAsync(row.id);
      toast({ title: 'Mapping deleted' });
    } catch (e) {
      toast({ title: 'Delete failed', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-wide flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Challenge ↔ Lesson Mappings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Map play.fgn.gg challenges to academy lessons. The sync function awards XP for every
            mapped lesson on completion.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Mapping
        </Button>
      </header>

      {list.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading mappings…
        </div>
      )}
      {list.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{String(list.error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3">
        {(list.data ?? []).map((row) => (
          <Card key={row.id} className="p-4 bg-card/50 backdrop-blur border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={row.is_active ? 'default' : 'secondary'}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {row.work_order_title && (
                    <span className="text-sm font-medium">{row.work_order_title}</span>
                  )}
                </div>
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {row.play_challenge_id}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">→ </span>
                  <span className="font-medium">{row.lesson_title ?? '(missing lesson)'}</span>
                  {row.module_title && (
                    <span className="text-muted-foreground"> · {row.module_title}</span>
                  )}
                  {row.course_title && (
                    <span className="text-muted-foreground"> · {row.course_title}</span>
                  )}
                </div>
                {row.notes && <p className="text-xs text-muted-foreground italic">{row.notes}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(row)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!list.isLoading && (list.data ?? []).length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No mappings yet. Click "New Mapping" to link a play.fgn.gg challenge to an academy
            lesson.
          </Card>
        )}
      </div>

      <MappingDialog
        state={dialog}
        onClose={close}
        onSave={async (input) => {
          try {
            await upsert.mutateAsync(input);
            toast({ title: dialog.editing ? 'Mapping updated' : 'Mapping created' });
            close();
          } catch (e) {
            toast({ title: 'Save failed', description: String(e), variant: 'destructive' });
          }
        }}
        saving={upsert.isPending}
        lessonOptions={lessons.data ?? []}
        challengeOptions={challenges.data ?? []}
      />
    </div>
  );
}

interface MappingDialogProps {
  state: DialogState;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    play_challenge_id: string;
    lesson_id: string;
    notes: string | null;
    is_active: boolean;
  }) => Promise<void>;
  saving: boolean;
  lessonOptions: { id: string; title: string; module_title: string; course_title: string }[];
  challengeOptions: { challenge_id: string; work_order_title: string }[];
}

function MappingDialog({
  state,
  onClose,
  onSave,
  saving,
  lessonOptions,
  challengeOptions,
}: MappingDialogProps) {
  const editing = state.editing;
  const [challenge, setChallenge] = useState('');
  const [customChallenge, setCustomChallenge] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [lessonId, setLessonId] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Initialize form whenever dialog opens
  useEffect(() => {
    if (!state.open) return;
    if (editing) {
      const known = challengeOptions.some((c) => c.challenge_id === editing.play_challenge_id);
      setChallenge(known ? editing.play_challenge_id : '');
      setUseCustom(!known);
      setCustomChallenge(known ? '' : editing.play_challenge_id);
      setLessonId(editing.lesson_id);
      setNotes(editing.notes ?? '');
      setIsActive(editing.is_active);
    } else {
      setChallenge('');
      setCustomChallenge('');
      setUseCustom(false);
      setLessonId('');
      setNotes('');
      setIsActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, editing?.id]);

  const reset = () => {
    setChallenge('');
    setCustomChallenge('');
    setUseCustom(false);
    setLessonId('');
    setNotes('');
    setIsActive(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const finalChallenge = useCustom ? customChallenge.trim() : challenge;
  const canSave = !!finalChallenge && !!lessonId && !saving;

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Mapping' : 'New Challenge ↔ Lesson Mapping'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>play.fgn.gg Challenge</Label>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setUseCustom((v) => !v)}
              >
                {useCustom ? 'Pick from work orders' : 'Enter custom ID'}
              </button>
            </div>
            {useCustom ? (
              <Input
                value={customChallenge}
                onChange={(e) => setCustomChallenge(e.target.value)}
                placeholder="UUID of the play.fgn.gg challenge"
                className="font-mono text-xs"
              />
            ) : (
              <Select value={challenge || 'none'} onValueChange={(v) => setChallenge(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a work order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select —</SelectItem>
                  {challengeOptions.map((c) => (
                    <SelectItem key={c.challenge_id} value={c.challenge_id}>
                      {c.work_order_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              Sourced from work_orders.fgn_origin_challenge_id (preferred) and source_challenge_id.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Target Lesson</Label>
            <Select value={lessonId || 'none'} onValueChange={(v) => setLessonId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lesson" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="none">— Select —</SelectItem>
                {lessonOptions.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.course_title} › {l.module_title} › {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="font-normal">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive mappings are skipped by the sync function.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSave}
            onClick={() => {
              onSave({
                id: editing?.id,
                play_challenge_id: finalChallenge,
                lesson_id: lessonId,
                notes: notes.trim() || null,
                is_active: isActive,
              }).then(() => reset());
            }}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? 'Save Changes' : 'Create Mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
