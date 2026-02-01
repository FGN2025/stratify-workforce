import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { GameIcon } from './GameIcon';
import type { ActiveStudent, GameTitle } from '@/types/tenant';
import { cn } from '@/lib/utils';
import { Radio, ChevronRight } from 'lucide-react';

// Simulated active students
const mockStudents: ActiveStudent[] = [
  { id: '1', username: 'TruckerMike', avatar_url: null, current_job: 'Cross-Country Freight Delivery', game_title: 'ATS', live_speed: 62, live_rpm: 1450, status: 'active' },
  { id: '2', username: 'SarahFields', avatar_url: null, current_job: 'Farm Equipment Maintenance', game_title: 'Mechanic_Sim', live_speed: 0, live_rpm: 0, status: 'active' },
  { id: '3', username: 'BuilderJohn', avatar_url: null, current_job: 'Excavator Foundation Dig', game_title: 'Construction_Sim', live_speed: 8, live_rpm: 1800, status: 'active' },
  { id: '4', username: 'JennyDriver', avatar_url: null, current_job: 'Fiber Line Installation', game_title: 'ATS', live_speed: 45, live_rpm: 1200, status: 'idle' },
];

// Generate simulated telemetry data
function generateTelemetryData() {
  const now = Date.now();
  return Array.from({ length: 30 }, (_, i) => ({
    time: new Date(now - (29 - i) * 2000).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }),
    speed: Math.floor(55 + Math.random() * 20 + Math.sin(i / 5) * 10),
    rpm: Math.floor(1200 + Math.random() * 400 + Math.cos(i / 3) * 200),
  }));
}

interface StudentRowProps {
  student: ActiveStudent;
  onClick: () => void;
}

function StudentRow({ student, onClick }: StudentRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        "hover:bg-muted/50 group text-left"
      )}
    >
      <div className="relative">
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={student.avatar_url || ''} />
          <AvatarFallback className="text-xs bg-muted">
            {student.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 status-led",
          student.status === 'active' ? 'status-led-online' : 'status-led-warning'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{student.username}</p>
        <p className="text-xs text-muted-foreground truncate">{student.current_job}</p>
      </div>

      <GameIcon game={student.game_title} size="sm" />

      <div className="text-right">
        <p className="font-data text-sm text-primary">
          {student.live_speed}<span className="text-xs text-muted-foreground ml-0.5">mph</span>
        </p>
        <p className="font-data text-xs text-muted-foreground">
          {student.live_rpm}<span className="text-[10px] ml-0.5">rpm</span>
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function LiveMonitor() {
  const [selectedStudent, setSelectedStudent] = useState<ActiveStudent | null>(null);
  const [telemetryData, setTelemetryData] = useState(generateTelemetryData());

  // Simulate live data updates
  useEffect(() => {
    if (!selectedStudent) return;

    const interval = setInterval(() => {
      setTelemetryData(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }),
          speed: Math.floor(55 + Math.random() * 20),
          rpm: Math.floor(1200 + Math.random() * 400),
        };
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedStudent]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse-glow" />
          <h2 className="text-lg font-semibold">Live Monitor</h2>
        </div>
        <span className="text-xs text-muted-foreground font-data">
          {mockStudents.length} online
        </span>
      </div>

      <div className="space-y-1">
        {mockStudents.map(student => (
          <StudentRow 
            key={student.id} 
            student={student} 
            onClick={() => {
              setSelectedStudent(student);
              setTelemetryData(generateTelemetryData());
            }}
          />
        ))}
      </div>

      {/* Telemetry Sheet */}
      <Sheet open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] glass-card border-l border-glass-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/30">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {selectedStudent?.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedStudent?.username}</span>
                <p className="text-xs font-normal text-muted-foreground">
                  {selectedStudent?.current_job}
                </p>
              </div>
            </SheetTitle>
            <SheetDescription>
              Live telemetry data from simulation session
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Speed Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Speed (mph)</h4>
                <span className="font-data text-lg text-primary">
                  {telemetryData[telemetryData.length - 1]?.speed || 0}
                </span>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryData}>
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RPM Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Engine RPM</h4>
                <span className="font-data text-lg text-amber-500">
                  {telemetryData[telemetryData.length - 1]?.rpm || 0}
                </span>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetryData}>
                    <XAxis 
                      dataKey="time" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[800, 2000]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      width={35}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rpm" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card !p-4">
                <p className="text-xs text-muted-foreground">Session Duration</p>
                <p className="font-data text-xl text-foreground mt-1">01:24:32</p>
              </div>
              <div className="stat-card !p-4">
                <p className="text-xs text-muted-foreground">Fuel Efficiency</p>
                <p className="font-data text-xl text-primary mt-1">8.2 mpg</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
