import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGameChannelColors } from '@/hooks/useGameChannelColors';
import { toast } from 'sonner';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Terminal, Code, Search, Download, FileText, Minus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

const GAME_LABELS: Record<GameTitle, string> = {
  ATS: 'Trucking Sim',
  Farming_Sim: 'Farming Sim',
  Construction_Sim: 'Construction Sim',
  Mechanic_Sim: 'Mechanic Sim',
  Fiber_Tech: 'Fiber-Tech',
  Roadcraft: 'Roadcraft',
  MSFS_2024: 'Microsoft Flight Simulator 2024',
};

interface WorkOrderRow {
  id: string;
  title: string;
  game_title: GameTitle;
  source_challenge_id: string | null;
  is_active: boolean | null;
  xp_reward: number;
  metadata: Record<string, unknown>;
}

export function ChallengesTab() {
  const queryClient = useQueryClient();
  const colorMap = useGameChannelColors();
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: workOrders, isLoading } = useQuery({
    queryKey: ['challenge-registry-work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, title, game_title, source_challenge_id, is_active, xp_reward, metadata')
        .order('game_title')
        .order('title');
      if (error) throw error;
      return (data || []).map(wo => ({
        ...wo,
        metadata: (wo.metadata as Record<string, unknown>) || {},
      })) as WorkOrderRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter(wo => {
      if (gameFilter !== 'all' && wo.game_title !== gameFilter) return false;
      if (activeFilter === 'active' && !wo.is_active) return false;
      if (activeFilter === 'inactive' && wo.is_active) return false;
      if (search && !wo.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [workOrders, gameFilter, activeFilter, search]);

  const getBreakroomCourseName = (wo: WorkOrderRow) =>
    (wo.metadata?.breakroom_course_name as string) || '';

  const handleStartEdit = (wo: WorkOrderRow) => {
    setEditingId(wo.id);
    setEditValue(getBreakroomCourseName(wo));
  };

  const handleSaveCourseName = useCallback(async (wo: WorkOrderRow) => {
    setEditingId(null);
    const oldValue = getBreakroomCourseName(wo);
    if (editValue === oldValue) return;

    const newMetadata = { ...wo.metadata, breakroom_course_name: editValue || undefined };
    if (!editValue) delete newMetadata.breakroom_course_name;

    // Optimistic update
    queryClient.setQueryData(['challenge-registry-work-orders'], (old: WorkOrderRow[] | undefined) =>
      old?.map(w => w.id === wo.id ? { ...w, metadata: newMetadata } : w)
    );

    const { error } = await supabase
      .from('work_orders')
      .update({ metadata: newMetadata as any })
      .eq('id', wo.id);

    if (error) {
      queryClient.invalidateQueries({ queryKey: ['challenge-registry-work-orders'] });
      toast.error('Failed to save course name');
    } else {
      toast.success('Breakroom course name saved');
    }
  }, [editValue, queryClient]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getPowerShell = (wo: WorkOrderRow) => {
    const sid = wo.source_challenge_id || wo.id;
    return `$body = '{"breakroom_username":"STUDENT_USERNAME","event_type":"quiz_complete","course_id_external":"${sid}","score":0,"passed":true,"xp_reward":${wo.xp_reward},"completion_time_minutes":0}'; $headers = @{"x-api-key"="fgn_br_sync_2026_NineStar_HCTC_Huxley_ForkedDeer_Adams";"Content-Type"="application/json"}; Invoke-RestMethod -Uri "https://vfzjfkcwromssjnlrhoo.supabase.co/functions/v1/breakroom-lms-sync" -Method POST -Headers $headers -Body $body`;
  };

  const getLuaEntry = (wo: WorkOrderRow) => {
    const name = getBreakroomCourseName(wo) || wo.title;
    const sid = wo.source_challenge_id || wo.id;
    return `["${name}"] = "${sid}",`;
  };

  const exportLua = () => {
    const entries = (workOrders || [])
      .filter(wo => wo.is_active && getBreakroomCourseName(wo))
      .map(wo => `  ${getLuaEntry(wo)}`)
      .join('\n');
    const content = `local COURSE_MAP = {\n${entries}\n}`;
    downloadFile(content, 'course_map.txt', 'text/plain');
    toast.success('Lua COURSE_MAP exported');
  };

  const exportCSV = () => {
    const headers = ['Title', 'Game Title', 'Source Challenge ID', 'Is Active', 'XP Reward', 'Breakroom Course Name'];
    const rows = filtered.map(wo => [
      wo.title,
      wo.game_title,
      wo.source_challenge_id || '',
      wo.is_active ? 'Yes' : 'No',
      wo.xp_reward.toString(),
      getBreakroomCourseName(wo),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, 'challenge_registry.csv', 'text/csv');
    toast.success('CSV exported');
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            {Object.entries(GAME_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={exportLua}>
            <FileText className="h-4 w-4 mr-1" />
            Export Lua
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No challenges found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Source Challenge ID</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Breakroom Course Name</TableHead>
                <TableHead className="text-center">BBW</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(wo => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium"
                      style={{
                        backgroundColor: `${colorMap[wo.game_title]}20`,
                        color: colorMap[wo.game_title],
                        borderColor: `${colorMap[wo.game_title]}40`,
                      }}
                    >
                      {GAME_LABELS[wo.game_title] || wo.game_title}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {wo.source_challenge_id ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded max-w-[180px] truncate block">
                          {wo.source_challenge_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(wo.source_challenge_id!, 'Challenge ID')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div
                      className="h-3 w-3 rounded-full mx-auto"
                      style={{ backgroundColor: wo.is_active ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))' }}
                    />
                  </TableCell>
                  <TableCell>
                    {editingId === wo.id ? (
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleSaveCourseName(wo)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCourseName(wo); }}
                        className="h-7 text-xs"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => handleStartEdit(wo)}
                        className="text-xs text-left w-full px-2 py-1 rounded hover:bg-muted transition-colors min-h-[28px]"
                      >
                        {getBreakroomCourseName(wo) || (
                          <span className="text-muted-foreground italic">Click to set...</span>
                        )}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Minus className="h-4 w-4 mx-auto text-muted-foreground/50" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(wo.source_challenge_id || wo.id, 'UUID')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy UUID</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(getPowerShell(wo), 'PowerShell command')}
                          >
                            <Terminal className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy PowerShell</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(getLuaEntry(wo), 'Lua entry')}
                          >
                            <Code className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Lua Entry</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
