import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SimulationItemPublic } from '@/hooks/useSimulations';

interface LoadoutBoardProps {
  items: SimulationItemPublic[];
  cats?: unknown;
  onSubmit: (selectedIds: string[]) => void;
  submitting: boolean;
}

// Parse the sim's cats payload into a { key -> label } map.
// Accepts either an array of { key, label } or a plain object map.
function buildCatLabelMap(cats: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cats) return out;
  if (Array.isArray(cats)) {
    for (const c of cats) {
      if (c && typeof c === 'object') {
        const key = (c as any).key ?? (c as any).id ?? (c as any).cat_key;
        const label = (c as any).label ?? (c as any).name;
        if (typeof key === 'string' && typeof label === 'string') out[key] = label;
      }
    }
  } else if (typeof cats === 'object') {
    for (const [k, v] of Object.entries(cats as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
      else if (v && typeof v === 'object') {
        const label = (v as any).label ?? (v as any).name;
        if (typeof label === 'string') out[k] = label;
      }
    }
  }
  return out;
}

export function LoadoutBoard({ items, cats, onSubmit, submitting }: LoadoutBoardProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const catLabels = useMemo(() => buildCatLabelMap(cats), [cats]);

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
    const key = it.cat_key || '';
    (acc[key] ||= []).push(it);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resources Needed for the Work Order</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select every resource this work order requires. Picking the wrong one costs points;
          picking a stand-down item ends the run.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(byCat).map(([cat, catItems]) => {
          const label = catLabels[cat];
          return (
            <div key={cat || 'ungrouped'}>
              {label && (
                <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-2">
                  {label}
                </h4>
              )}
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
          );
        })}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <Button onClick={() => onSubmit(Array.from(selected))} disabled={submitting || selected.size === 0}>
            {submitting ? 'Scoring…' : 'Submit Resources'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
