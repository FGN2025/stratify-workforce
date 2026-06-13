import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export interface DebriefPayload {
  grade: string;
  percent: number;
  raw: number;
  max: number;
  stand_down: boolean;
  critFailLine: string | null;
  per_item: Array<{
    item_id: string;
    item_key: string;
    name: string;
    included: boolean;
    correct_choice: boolean;
    required: boolean;
    in_order: boolean | null;
    why: string | null;
  }>;
}

interface Props {
  debrief: DebriefPayload;
  onBack: () => void;
}

export function DebriefPanel({ debrief, onBack }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            Debrief
            <Badge variant={debrief.stand_down ? 'destructive' : 'default'}>{debrief.grade}</Badge>
          </CardTitle>
          <div className="text-right">
            <div className="font-mono text-2xl">{debrief.percent}%</div>
            <div className="text-xs text-muted-foreground">
              {debrief.raw} / {debrief.max} raw
            </div>
          </div>
        </div>
        {debrief.stand_down && debrief.critFailLine && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span>{debrief.critFailLine}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {debrief.per_item
          .filter((p) => p.included || p.required)
          .map((p) => {
            const good =
              p.included && p.correct_choice && (p.in_order === null || p.in_order === true);
            return (
              <div
                key={p.item_id}
                className={`flex items-start gap-2 p-2 rounded-md border ${
                  good ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'
                }`}
              >
                {good ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  {p.why && <div className="text-xs text-muted-foreground mt-0.5">{p.why}</div>}
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                    {p.included ? 'Selected' : 'Skipped'}
                    {p.in_order === false && ' · out of order'}
                    {!p.correct_choice && p.included && ' · not required'}
                  </div>
                </div>
              </div>
            );
          })}
        <div className="pt-3 flex justify-end">
          <Button onClick={onBack}>Return to Work Order</Button>
        </div>
      </CardContent>
    </Card>
  );
}
