import { useParams, NavLink } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameIcon, getGameLabel } from '@/components/dashboard/GameIcon';
import { XPRewardBadge } from '@/components/work-orders/XPRewardBadge';
import { DifficultyIndicator, getDifficultyLabel } from '@/components/work-orders/DifficultyIndicator';
import { ChannelSubscribeButton } from '@/components/work-orders/ChannelSubscribeButton';
import { useWorkOrderById } from '@/hooks/useWorkOrders';
import { useUserWorkOrderStatus, useStartWorkOrder, calculateWorkOrderXP } from '@/hooks/useWorkOrderCompletion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Clock,
  Target,
  Users,
  Trophy,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: workOrder, isLoading } = useWorkOrderById(id || '');
  const { data: status } = useUserWorkOrderStatus(id || '');
  const startWorkOrder = useStartWorkOrder();

  const handleStart = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to start this work order.',
        variant: 'destructive',
      });
      return;
    }

    if (!id) return;

    try {
      await startWorkOrder.mutateAsync(id);
      toast({
        title: 'Work Order Started',
        description: 'Good luck! Complete the objectives to earn XP.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start work order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 lg:col-span-2" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!workOrder) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Work Order Not Found</h2>
          <p className="text-muted-foreground mt-2">This work order may have been removed or doesn't exist.</p>
          <NavLink to="/work-orders" className="mt-4">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </NavLink>
        </div>
      </AppLayout>
    );
  }

  const criteria = workOrder.success_criteria;
  const potentialXP = calculateWorkOrderXP({
    baseXP: workOrder.xp_reward,
    score: 90, // Max potential
    isFirstAttempt: !status?.hasAttempted,
    difficulty: workOrder.difficulty,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <NavLink to="/work-orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Work Orders
        </NavLink>

        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Game Icon */}
            <div className="shrink-0">
              <GameIcon game={workOrder.game_title} size="lg" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">{getGameLabel(workOrder.game_title)}</Badge>
                <DifficultyIndicator difficulty={workOrder.difficulty} showLabel />
                {status?.isCompleted && (
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold mb-2">{workOrder.title}</h1>
              <p className="text-muted-foreground">{workOrder.description}</p>

              <div className="flex flex-wrap items-center gap-4 mt-4">
                <XPRewardBadge xp={workOrder.xp_reward} size="lg" />
                {workOrder.estimated_time_minutes && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    ~{workOrder.estimated_time_minutes} min
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-data">24</span> completed
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 shrink-0">
              {!status?.hasAttempted || status.latestStatus !== 'in_progress' ? (
                <Button size="lg" onClick={handleStart} disabled={startWorkOrder.isPending}>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  {status?.hasAttempted ? 'Try Again' : 'Start Work Order'}
                </Button>
              ) : (
                <Button size="lg" variant="secondary">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Continue
                </Button>
              )}
              
              <ChannelSubscribeButton gameTitle={workOrder.game_title} variant="outline" />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Success Criteria */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Success Criteria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(criteria).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <Badge variant="outline" className="font-data">
                    {typeof value === 'number' && key.includes('score') ? `${value}%` : value}
                  </Badge>
                </div>
              ))}
              
              {Object.keys(criteria).length === 0 && (
                <p className="text-muted-foreground text-sm">No specific criteria defined.</p>
              )}
            </CardContent>
          </Card>

          {/* XP Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                XP Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base XP</span>
                  <span className="font-data">{workOrder.xp_reward}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Difficulty Bonus ({getDifficultyLabel(workOrder.difficulty)})</span>
                  <span className="font-data text-primary">
                    +{Math.round((workOrder.difficulty === 'advanced' ? 0.5 : workOrder.difficulty === 'intermediate' ? 0.2 : 0) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Score Bonus (90%+)</span>
                  <span className="font-data text-primary">+50%</span>
                </div>
                {!status?.hasAttempted && (
                  <div className="flex justify-between text-sm">
                    <span>First Attempt Bonus</span>
                    <span className="font-data text-primary">+25%</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Max Potential</span>
                  <XPRewardBadge xp={potentialXP} size="lg" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Progress */}
          {status?.hasAttempted && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-data font-bold">{status.attemptCount}</p>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                  </div>
                  {status.bestScore !== undefined && status.bestScore !== null && (
                    <div className="text-center">
                      <p className="text-3xl font-data font-bold text-primary">{status.bestScore}%</p>
                      <p className="text-xs text-muted-foreground">Best Score</p>
                    </div>
                  )}
                  <div className="flex-1">
                    <Progress value={status.isCompleted ? 100 : 50} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {status.isCompleted ? 'Completed!' : 'In Progress'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
