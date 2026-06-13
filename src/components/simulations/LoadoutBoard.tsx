import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SimulationItemPublic } from '@/hooks/useSimulations';

interface LoadoutBoardProps {
  items: SimulationItemPublic[];
  onSubmit: (selectedIds: string[]) => void;
  submitting: boolean;
}

export function LoadoutBoard({ items, onSubmit, submitting }: LoadoutBoardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Group by cat_key for readability
  const byCat = items.reduce<Record<string, SimulationItemPublic[]>>((acc, it) => {
    const key = it.cat_key || 'general';
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Load the Airplane</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select every item required for this flight. Picking the wrong item costs points; picking a
          stand-down item ends the run.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(byCat).map(([cat, catItems]) => (
          <div key={cat}>
            <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
              {cat}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {catItems.map((it) => {
                const isSel = selected.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggle(it.id)}
                    className={`text-left px-3 py-2 rounded-md border transition ${
                      isSel
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{it.name}</div>
                    {it.sub && <div className="text-xs text-muted-foreground">{it.sub}</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <Button onClick={() => onSubmit(Array.from(selected))} disabled={submitting || selected.size === 0}>
            {submitting ? 'Scoring…' : 'Submit Loadout'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
