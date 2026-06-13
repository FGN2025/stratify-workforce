import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import type { SimulationItemPublic } from '@/hooks/useSimulations';

interface SequenceBoardProps {
  items: SimulationItemPublic[];
  onSubmit: (orderedIds: string[]) => void;
  submitting: boolean;
}

export function SequenceBoard({ items, onSubmit, submitting }: SequenceBoardProps) {
  const [chosen, setChosen] = useState<string[]>([]);

  const available = items.filter((it) => !chosen.includes(it.id));
  const chosenItems = chosen
    .map((id) => items.find((it) => it.id === id))
    .filter((x): x is SimulationItemPublic => !!x);

  const add = (id: string) => setChosen((c) => [...c, id]);
  const remove = (idx: number) => setChosen((c) => c.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    setChosen((c) => {
      const next = [...c];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return c;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan the Route</CardTitle>
        <p className="text-sm text-muted-foreground">
          Build the procedure in the correct relative order. Required steps in the wrong order cost
          points; skipped required steps cost less; non-required steps cost points.
        </p>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Available steps
          </h4>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {available.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => add(it.id)}
                className="w-full text-left px-3 py-2 rounded-md border border-border bg-card hover:border-primary/50 transition"
              >
                <div className="font-medium text-sm">{it.name}</div>
                {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
              </button>
            ))}
            {available.length === 0 && (
              <div className="text-sm text-muted-foreground italic px-3 py-2">
                All steps placed in sequence.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
            Your sequence
          </h4>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {chosenItems.map((it, idx) => (
              <div
                key={`${it.id}-${idx}`}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5"
              >
                <span className="font-mono text-xs text-primary w-6">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.name}</div>
                  {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === chosenItems.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {chosenItems.length === 0 && (
              <div className="text-sm text-muted-foreground italic px-3 py-2">
                Click a step on the left to add it.
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">{chosen.length} steps in sequence</span>
          <Button onClick={() => onSubmit(chosen)} disabled={submitting || chosen.length === 0}>
            {submitting ? 'Scoring…' : 'Submit Sequence'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
