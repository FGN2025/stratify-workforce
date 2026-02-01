import { useState, useEffect } from 'react';
import { Gauge, Radio, Wifi, WifiOff, Truck, ChevronDown, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameIcon } from '@/components/dashboard/GameIcon';
import { Button } from '@/components/ui/button';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const AgentWidget = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentJob, setCurrentJob] = useState({
    title: 'Cross-Country Freight Delivery',
    game: 'ATS' as const,
    progress: 67,
  });

  // Simulate connection and logs
  useEffect(() => {
    const bootSequence: LogEntry[] = [
      { timestamp: '10:24:01', message: 'FGN Agent v1.0.0 initializing...', type: 'info' },
      { timestamp: '10:24:02', message: 'Scanning for simulation software...', type: 'info' },
      { timestamp: '10:24:03', message: 'Found: American Truck Simulator', type: 'success' },
      { timestamp: '10:24:04', message: 'Connecting to SimHub telemetry...', type: 'info' },
      { timestamp: '10:24:05', message: 'SimHub connection established', type: 'success' },
      { timestamp: '10:24:06', message: 'Authenticating with FGN Academy...', type: 'info' },
    ];

    bootSequence.forEach((log, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, log]);
        if (index === bootSequence.length - 1) {
          setTimeout(() => {
            setLogs(prev => [...prev, {
              timestamp: '10:24:07',
              message: 'Connected to FGN Academy servers',
              type: 'success'
            }]);
            setIsConnected(true);
          }, 1000);
        }
      }, index * 800);
    });
  }, []);

  // Simulate live data updates
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const messages = [
        'Telemetry data sent',
        'GPS position updated',
        'Speed: 62 mph | RPM: 1450',
        'Fuel level: 78%',
        'Distance remaining: 342 mi',
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      setLogs(prev => {
        const newLogs = [...prev, {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          message: randomMessage,
          type: 'info' as const,
        }];
        // Keep only last 50 logs
        return newLogs.slice(-50);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Agent Window Container - 400x600 */}
      <div 
        className="w-[400px] h-[600px] glass-card border border-glass-border rounded-xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <Gauge className="h-6 w-6 text-primary" />
            <span className="font-semibold">FGN Agent</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "status-led",
              isConnected ? "status-led-online" : "status-led-offline"
            )} />
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Current Job Card */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Current Work Order
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <ChevronDown className="h-3 w-3 mr-1" />
              Switch
            </Button>
          </div>
          
          <div className="glass-card p-4 border-primary/30">
            <div className="flex items-start gap-3">
              <GameIcon game={currentJob.game} size="lg" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{currentJob.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  American Truck Simulator
                </p>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-data text-primary">{currentJob.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${currentJob.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Stats */}
        {isConnected && (
          <div className="grid grid-cols-3 gap-2 p-4 border-b border-border">
            <div className="text-center">
              <p className="font-data text-xl text-primary">62</p>
              <p className="text-[10px] text-muted-foreground">MPH</p>
            </div>
            <div className="text-center">
              <p className="font-data text-xl text-amber-500">1,450</p>
              <p className="text-[10px] text-muted-foreground">RPM</p>
            </div>
            <div className="text-center">
              <p className="font-data text-xl text-emerald-500">78%</p>
              <p className="text-[10px] text-muted-foreground">FUEL</p>
            </div>
          </div>
        )}

        {/* Console Window */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/30">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Console</span>
            {isConnected && (
              <Radio className="h-3 w-3 text-emerald-500 animate-pulse ml-auto" />
            )}
          </div>
          
          <div className="flex-1 overflow-auto console-window p-3 scrollbar-dark">
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2 text-[11px] leading-relaxed">
                  <span className="text-muted-foreground font-data shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span className={cn(
                    log.type === 'success' && 'text-emerald-400',
                    log.type === 'error' && 'text-red-400',
                    log.type === 'warning' && 'text-amber-400',
                    log.type === 'info' && 'text-foreground/80'
                  )}>
                    {log.message}
                  </span>
                </div>
              ))}
              {/* Blinking cursor */}
              <div className="flex gap-2 text-[11px]">
                <span className="text-muted-foreground font-data shrink-0">
                  [{new Date().toLocaleTimeString('en-US', { hour12: false })}]
                </span>
                <span className="text-primary animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-surface/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {isConnected ? 'Session active • Data encrypted' : 'Connecting...'}
          </span>
          <Button 
            size="sm" 
            variant={isConnected ? "destructive" : "default"}
            className="h-7 text-xs"
          >
            {isConnected ? 'End Session' : 'Retry'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentWidget;
