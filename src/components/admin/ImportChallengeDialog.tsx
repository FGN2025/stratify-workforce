import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, CheckCircle, Trophy, Clock, Gamepad2, Target } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];
type WorkOrderDifficulty = Database['public']['Enums']['work_order_difficulty'];

export interface ExternalTask {
  id: string;
  challenge_id: string;
  title: string;
  description: string | null;
  order_index: number;
}

export interface ExternalChallenge {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  points_reward: number | null;
  estimated_time_minutes: number | null;
  cover_image_url: string | null;
  is_active: boolean;
  already_imported: boolean;
  games?: { name: string } | null;
  tasks?: ExternalTask[];
}

// Map play.fgn.gg game names to our enum values
const GAME_NAME_MAP: Record<string, GameTitle> = {
  'American Truck Simulator': 'ATS',
  'Farming Simulator': 'Farming_Sim',
  'Construction Simulator': 'Construction_Sim',
  'Mechanic Simulator': 'Mechanic_Sim',
  'Fiber-Tech Simulator': 'Fiber_Tech',
  'Roadcraft': 'Fiber_Tech',
};

// Map difficulty strings
const DIFFICULTY_MAP: Record<string, WorkOrderDifficulty> = {
  easy: 'beginner',
  beginner: 'beginner',
  medium: 'intermediate',
  intermediate: 'intermediate',
  hard: 'advanced',
  advanced: 'advanced',
};

export interface MappedChallengeData {
  title: string;
  description: string;
  gameTitle: GameTitle;
  difficulty: WorkOrderDifficulty;
  xpReward: number;
  estimatedTime: number | null;
  coverImageUrl: string | null;
  fgnOriginChallengeId: string;
  tasks: ExternalTask[];
}

interface ImportChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (data: MappedChallengeData) => void;
}

export function ImportChallengeDialog({
  open,
  onOpenChange,
  onSelect,
}: ImportChallengeDialogProps) {
  const [challenges, setChallenges] = useState<ExternalChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');

  useEffect(() => {
    if (open) {
      fetchChallenges();
    }
  }, [open]);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-challenges`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch challenges');
      }

      const { challenges: data } = await response.json();
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast({
        title: 'Error',
        description: 'Failed to load challenges from play.fgn.gg',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Collect unique game names for filter
  const gameNames = [...new Set(challenges.map(c => c.games?.name).filter(Boolean))] as string[];

  const filtered = challenges.filter(c => {
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGame = gameFilter === 'all' || c.games?.name === gameFilter;
    return matchesSearch && matchesGame;
  });

  const handleSelect = (challenge: ExternalChallenge) => {
    const gameName = challenge.games?.name || '';
    const mappedGame = GAME_NAME_MAP[gameName] || 'ATS';
    const mappedDifficulty = DIFFICULTY_MAP[challenge.difficulty?.toLowerCase() || ''] || 'beginner';

    onSelect({
      title: challenge.name,
      description: challenge.description || '',
      gameTitle: mappedGame,
      difficulty: mappedDifficulty,
      xpReward: challenge.points_reward || 50,
      estimatedTime: challenge.estimated_time_minutes,
      coverImageUrl: challenge.cover_image_url,
      fgnOriginChallengeId: challenge.id,
      tasks: challenge.tasks || [],
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Challenge from FGN
          </DialogTitle>
          <DialogDescription>
            Select a challenge from play.fgn.gg to auto-populate the work order form.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search challenges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={gameFilter} onValueChange={setGameFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Games" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {gameNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Challenge List */}
        <ScrollArea className="h-[400px] pr-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Gamepad2 className="h-10 w-10 mb-3" />
              <p className="text-sm">No challenges found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(challenge => (
                <button
                  key={challenge.id}
                  type="button"
                  disabled={challenge.already_imported}
                  onClick={() => handleSelect(challenge)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    challenge.already_imported
                      ? 'border-border/30 bg-muted/20 opacity-60 cursor-not-allowed'
                      : 'border-border/50 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {challenge.cover_image_url ? (
                      <img
                        src={challenge.cover_image_url}
                        alt={challenge.name}
                        className="h-14 w-20 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{challenge.name}</h4>
                        {challenge.already_imported && (
                          <Badge variant="outline" className="text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Imported
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {challenge.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {challenge.games?.name && (
                          <span className="text-xs text-muted-foreground">
                            {challenge.games.name}
                          </span>
                        )}
                        {challenge.difficulty && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {challenge.difficulty}
                          </Badge>
                        )}
                        {challenge.points_reward != null && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Trophy className="h-3 w-3" />
                            {challenge.points_reward} XP
                          </span>
                        )}
                        {challenge.estimated_time_minutes != null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {challenge.estimated_time_minutes}m
                          </span>
                        )}
                        {challenge.tasks && challenge.tasks.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="h-3 w-3" />
                            {challenge.tasks.length} task{challenge.tasks.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-center">
          {filtered.length} challenge{filtered.length !== 1 ? 's' : ''} available
          {filtered.some(c => c.already_imported) && ' • Already imported items are disabled'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
