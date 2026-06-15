import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, ListChecks } from 'lucide-react';
import { useSimulationsForWorkOrder } from '@/hooks/useSimulations';

interface Props {
  workOrderId: string;
}

export function WorkOrderSimulationsCard({ workOrderId }: Props) {
  const navigate = useNavigate();
  const { data: sims, isLoading } = useSimulationsForWorkOrder(workOrderId);

  if (isLoading || !sims || sims.length === 0) return null;

  return (
    <Card className="lg:col-span-3 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          {sims.length === 1 ? 'Simulation' : 'Choose Your Simulation'}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-3">
        {sims.map((s) => {
          const label =
            s.sim_type === 'sequence' ? 'Procedure' : 'Resources';
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/simulations/${s.id}`)}
              className="text-left p-4 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {s.wo_code} · {label}
                  </div>
                  <div className="font-semibold mt-1">{s.title}</div>
                  {s.blurb && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.blurb}</div>
                  )}
                </div>
                <PlayCircle className="h-6 w-6 text-primary shrink-0 group-hover:scale-110 transition" />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
