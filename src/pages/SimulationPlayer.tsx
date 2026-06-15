import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSimulationDetail } from '@/hooks/useSimulations';
import { LoadoutBoard } from '@/components/simulations/LoadoutBoard';
import { SequenceBoard } from '@/components/simulations/SequenceBoard';
import { DebriefPanel, type DebriefPayload } from '@/components/simulations/DebriefPanel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function SimulationPlayer() {
  const { simulationId } = useParams<{ simulationId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { data, isLoading } = useSimulationDetail(simulationId);
  const [submitting, setSubmitting] = useState(false);
  const [debrief, setDebrief] = useState<DebriefPayload | null>(null);

  const handleSubmit = async (selections: string[]) => {
    if (!simulationId || !session?.access_token) return;
    setSubmitting(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke('score-simulation', {
        body: { simulation_id: simulationId, selections },
      });
      if (error) throw error;
      setDebrief(resp.debrief as DebriefPayload);
    } catch (e) {
      toast({
        title: 'Scoring failed',
        description: e instanceof Error ? e.message : 'Unable to score this run.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/work-orders/${data.sim.work_order_id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Work Order
        </Button>

        {!debrief && (
          <Card>
            <CardHeader>
              <CardTitle>{data.sim.title}</CardTitle>
              {data.sim.blurb && <p className="text-sm text-muted-foreground">{data.sim.blurb}</p>}
            </CardHeader>
            <CardContent>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {data.sim.wo_code} · {data.sim.sim_type}
              </div>
            </CardContent>
          </Card>
        )}

        {debrief ? (
          <DebriefPanel debrief={debrief} onBack={() => navigate(`/work-orders/${data.sim.work_order_id}`)} />
        ) : data.sim.sim_type === 'loadout' ? (
          <LoadoutBoard items={data.items} cats={data.sim.cats} onSubmit={handleSubmit} submitting={submitting} />
        ) : (
          <SequenceBoard items={data.items} onSubmit={handleSubmit} submitting={submitting} />
        )}
      </div>
    </AppLayout>
  );
}
