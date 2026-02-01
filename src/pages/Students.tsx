import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical,
  Mail,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { GameIcon } from '@/components/dashboard/GameIcon';
import { useTenant } from '@/contexts/TenantContext';
import { cn } from '@/lib/utils';
import type { GameTitle } from '@/types/tenant';

interface Student {
  id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  employability_score: number;
  total_hours: number;
  last_active: string;
  status: 'active' | 'idle' | 'offline';
  current_game: GameTitle | null;
  trend: number;
}

const mockStudents: Student[] = [
  { id: '1', username: 'TruckerMike', email: 'mike@example.com', avatar_url: null, employability_score: 94.2, total_hours: 245, last_active: '2 min ago', status: 'active', current_game: 'ATS', trend: 2.4 },
  { id: '2', username: 'SarahFields', email: 'sarah@example.com', avatar_url: null, employability_score: 91.8, total_hours: 198, last_active: '15 min ago', status: 'active', current_game: 'Mechanic_Sim', trend: 1.2 },
  { id: '3', username: 'BuilderJohn', email: 'john@example.com', avatar_url: null, employability_score: 89.5, total_hours: 167, last_active: '1 hour ago', status: 'idle', current_game: null, trend: -0.8 },
  { id: '4', username: 'Marcus Johnson', email: 'marcus@example.com', avatar_url: null, employability_score: 78.5, total_hours: 142, last_active: '30 min ago', status: 'active', current_game: 'ATS', trend: 4.2 },
  { id: '5', username: 'JennyDriver', email: 'jenny@example.com', avatar_url: null, employability_score: 76.2, total_hours: 134, last_active: '3 hours ago', status: 'offline', current_game: null, trend: 0.5 },
  { id: '6', username: 'Alex Torres', email: 'alex@example.com', avatar_url: null, employability_score: 74.8, total_hours: 128, last_active: '1 day ago', status: 'offline', current_game: null, trend: -1.2 },
  { id: '7', username: 'Kim Chen', email: 'kim@example.com', avatar_url: null, employability_score: 72.1, total_hours: 115, last_active: '5 min ago', status: 'active', current_game: 'Construction_Sim', trend: 3.1 },
  { id: '8', username: 'Bob Williams', email: 'bob@example.com', avatar_url: null, employability_score: 68.9, total_hours: 98, last_active: '2 days ago', status: 'offline', current_game: null, trend: -0.3 },
];

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

const Students = () => {
  const { tenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = mockStudents.filter(student =>
    student.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage enrolled operators in {tenant?.name || 'your organization'}
            </p>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Total Students</p>
            <p className="font-data text-2xl text-foreground mt-1">{mockStudents.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Active Now</p>
            <p className="font-data text-2xl text-emerald-500 mt-1">
              {mockStudents.filter(s => s.status === 'active').length}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Avg. Score</p>
            <p className="font-data text-2xl text-primary mt-1">
              {(mockStudents.reduce((acc, s) => acc + s.employability_score, 0) / mockStudents.length).toFixed(1)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="font-data text-2xl text-foreground mt-1">
              {mockStudents.reduce((acc, s) => acc + s.total_hours, 0)}h
            </p>
          </div>
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
              {filteredStudents.map((student) => (
                <TableRow 
                  key={student.id} 
                  className="border-border hover:bg-muted/30 cursor-pointer"
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
                        <p className="font-medium text-sm">{student.username}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {student.email}
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
                      {student.last_active}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No students found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Students;
