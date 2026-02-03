import { useMyCommunities } from '@/hooks/useMyCommunities';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CommunityApprovalStatus } from '@/types/tenant';

const STATUS_CONFIG: Record<CommunityApprovalStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  needs_revision: {
    label: 'Needs Revision',
    icon: AlertTriangle,
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
};

interface MyCommunitiesProps {
  onCreateClick: () => void;
}

export function MyCommunities({ onCreateClick }: MyCommunitiesProps) {
  const { user } = useAuth();
  const { myCommunities, isLoading } = useMyCommunities();

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">My Communities</CardTitle>
          <CardDescription>
            Communities you've created or are managing
          </CardDescription>
        </div>
        <Button size="sm" onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-1" />
          Create
        </Button>
      </CardHeader>
      <CardContent>
        {myCommunities.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              You haven't created any communities yet.
            </p>
            <Button variant="outline" onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Community
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {myCommunities.map((community) => {
              const statusConfig = STATUS_CONFIG[community.approval_status];
              const StatusIcon = statusConfig.icon;
              const isApproved = community.approval_status === 'approved';

              return (
                <div
                  key={community.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={community.logo_url || undefined} />
                      <AvatarFallback style={{ backgroundColor: community.brand_color }}>
                        <Building2 className="h-5 w-5 text-white" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{community.name}</p>
                      <p className="text-xs text-muted-foreground">@{community.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={statusConfig.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    {isApproved && (
                      <Link to={`/community/${community.slug}`}>
                        <Button variant="ghost" size="sm">
                          View
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Show reviewer notes for rejected/needs_revision */}
            {myCommunities.some(c => c.reviewer_notes && ['rejected', 'needs_revision'].includes(c.approval_status)) && (
              <div className="mt-4 space-y-3">
            {myCommunities
                  .filter(c => c.reviewer_notes && ['rejected', 'needs_revision'].includes(c.approval_status))
                  .map(community => (
                    <div
                      key={`notes-${community.id}`}
                      className="p-3 rounded-lg border border-destructive/30 bg-destructive/10"
                    >
                      <p className="text-sm font-medium mb-1">
                        Feedback for "{community.name}":
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {community.reviewer_notes}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
