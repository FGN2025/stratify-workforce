import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHero } from '@/components/marketplace/PageHero';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  Zap,
  GraduationCap,
  ExternalLink,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { GameIcon } from '@/components/dashboard/GameIcon';
import { useTenant } from '@/contexts/TenantContext';
import { useStudents, type Student } from '@/hooks/useStudents';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: Student['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    idle: { label: 'Idle', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    offline: { label: 'Offline', className: 'bg-muted text-muted-foreground border-border' },
  };

  const { label, className } = config[status];

  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium', className)}>
      {label}
    </Badge>
  );
}

function StudentCard({ student, onClick }: { student: Student; onClick: () => void }) {
  return (
    <Card 
      className="glass-card min-w-[240px] hover:border-primary/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={student.avatar_url || ''} />
              <AvatarFallback className="text-sm bg-muted">
                {student.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {student.status === 'active' && (
              <div className="absolute -bottom-0.5 -right-0.5 status-led status-led-online" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{student.username}</p>
            <StatusBadge status={student.status} />
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <div>
            <p className="font-data text-lg text-primary">{student.employability_score}</p>
            <p className="text-[10px] text-muted-foreground">Score</p>
          </div>
          <div className="text-right">
            <p className="font-data text-lg">{student.total_hours}h</p>
            <p className="text-[10px] text-muted-foreground">Hours</p>
          </div>
          {student.trend > 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : student.trend < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentCardSkeleton() {
  return (
    <Card className="glass-card min-w-[240px]">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow className="border-border">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
  );
}

const Students = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { data: students = [], isLoading } = useStudents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(student =>
    student.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStudents = students.filter(s => s.status === 'active');
  const topPerformers = [...students].sort((a, b) => b.employability_score - a.employability_score).slice(0, 4);
  const avgScore = students.length > 0 
    ? (students.reduce((acc, s) => acc + s.employability_score, 0) / students.length).toFixed(1)
    : '0';

  const handleViewProfile = (studentId: string) => {
    navigate(`/profile/${studentId}`);
  };

  return (
    <AppLayout>
      <div className="space-y-10">
        {/* Hero Section */}
        <PageHero
          title="Students"
          subtitle="Monitor and manage enrolled operators. Track progress, view certifications, and support your team's development."
          backgroundImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&h=600&fit=crop"
          primaryAction={{
            label: 'Add Student',
            icon: <UserPlus className="h-4 w-4" />,
          }}
          secondaryAction={{
            label: 'Filter',
            icon: <Filter className="h-4 w-4" />,
          }}
          stats={[
            { value: `${students.length}`, label: 'Total Students', highlight: true },
            { value: `${activeStudents.length}`, label: 'Active Now' },
            { value: avgScore, label: 'Avg. Score' },
          ]}
        />

        {/* Active Now Carousel */}
        {isLoading ? (
          <HorizontalCarousel
            title="Active Now"
            subtitle="Students currently in training sessions"
            icon={<Zap className="h-5 w-5" />}
          >
            {[1, 2, 3].map((i) => (
              <div key={`skeleton-active-${i}`} className="shrink-0 snap-start">
                <StudentCardSkeleton />
              </div>
            ))}
          </HorizontalCarousel>
        ) : activeStudents.length > 0 ? (
          <HorizontalCarousel
            title="Active Now"
            subtitle="Students currently in training sessions"
            icon={<Zap className="h-5 w-5" />}
          >
            {activeStudents.map((student) => (
              <div key={`active-${student.id}`} className="shrink-0 snap-start">
                <StudentCard student={student} onClick={() => handleViewProfile(student.id)} />
              </div>
            ))}
          </HorizontalCarousel>
        ) : null}

        {/* Top Performers Carousel */}
        {isLoading ? (
          <HorizontalCarousel
            title="Top Performers"
            subtitle="Highest scoring operators this month"
            icon={<Star className="h-5 w-5" />}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={`skeleton-top-${i}`} className="shrink-0 snap-start">
                <StudentCardSkeleton />
              </div>
            ))}
          </HorizontalCarousel>
        ) : topPerformers.length > 0 ? (
          <HorizontalCarousel
            title="Top Performers"
            subtitle="Highest scoring operators this month"
            icon={<Star className="h-5 w-5" />}
          >
            {topPerformers.map((student) => (
              <div key={`top-${student.id}`} className="shrink-0 snap-start">
                <StudentCard student={student} onClick={() => handleViewProfile(student.id)} />
              </div>
            ))}
          </HorizontalCarousel>
        ) : null}

        {/* Search & Table Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide">All Students</h2>
              <p className="text-sm text-muted-foreground">Complete roster for {tenant?.name || 'your organization'}</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {/* Students Table */}
          <div className="glass-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Student</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Score</TableHead>
                  <TableHead className="text-muted-foreground text-right">Hours</TableHead>
                  <TableHead className="text-muted-foreground">Current Activity</TableHead>
                  <TableHead className="text-muted-foreground">Last Active</TableHead>
                  <TableHead className="text-muted-foreground w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRowSkeleton key={`skeleton-row-${i}`} />
                    ))}
                  </>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id} 
                      className="border-border hover:bg-muted/30 cursor-pointer group"
                      onClick={() => handleViewProfile(student.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={student.avatar_url || ''} />
                              <AvatarFallback className="text-xs bg-muted">
                                {student.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {student.status === 'active' && (
                              <div className="absolute -bottom-0.5 -right-0.5 status-led status-led-online" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {student.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              View Skill Passport →
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={student.status} />
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-data text-primary">{student.employability_score}</span>
                          {student.trend > 0 ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : student.trend < 0 ? (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-data text-muted-foreground">{student.total_hours}h</span>
                      </TableCell>

                      <TableCell>
                        {student.current_game ? (
                          <div className="flex items-center gap-2">
                            <GameIcon game={student.current_game} size="sm" />
                            <span className="text-xs text-muted-foreground">In session</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {student.last_active || 'Never'}
                        </div>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewProfile(student.id);
                            }}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Skill Passport
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Activity className="h-4 w-4 mr-2" />
                              View Activity
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {!isLoading && filteredStudents.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery 
                  ? `No students found matching "${searchQuery}"`
                  : 'No students enrolled yet'
                }
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Students;
