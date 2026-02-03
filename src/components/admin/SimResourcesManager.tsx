import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  GraduationCap,
  Briefcase,
  Link,
  BookOpen,
  Video,
  FileText,
  Map,
  Truck,
  Tractor,
  HardHat,
  Wrench,
  Cable,
  Trophy,
  Target,
  Users,
} from 'lucide-react';
import { useAllSimResources, useSimResourceMutations, type SimResource, type SimResourceInsert } from '@/hooks/useSimResources';
import { SimResourceEditDialog } from './SimResourceEditDialog';
import type { Database } from '@/integrations/supabase/types';

type GameTitle = Database['public']['Enums']['game_title'];

const GAME_CONFIG: Record<GameTitle, { title: string; icon: React.ElementType; color: string }> = {
  ATS: { title: 'American Truck Simulator', icon: Truck, color: '#3B82F6' },
  Farming_Sim: { title: 'Farming Simulator', icon: Tractor, color: '#22C55E' },
  Construction_Sim: { title: 'Construction Simulator', icon: HardHat, color: '#F59E0B' },
  Mechanic_Sim: { title: 'Mechanic Simulator', icon: Wrench, color: '#EF4444' },
  Fiber_Tech: { title: 'Fiber-Tech Simulator', icon: Cable, color: '#8B5CF6' },
};

const ICON_MAP: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'link': Link,
  'book-open': BookOpen,
  'video': Video,
  'file-text': FileText,
  'map': Map,
  'truck': Truck,
  'tractor': Tractor,
  'hard-hat': HardHat,
  'wrench': Wrench,
  'trophy': Trophy,
  'target': Target,
  'users': Users,
};

export function SimResourcesManager() {
  const { data: resources, isLoading } = useAllSimResources();
  const { createResource, updateResource, deleteResource, toggleActive } = useSimResourceMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<GameTitle | 'all'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<SimResource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<SimResource | null>(null);

  // Filter resources
  const filteredResources = (resources || []).filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGame = gameFilter === 'all' || resource.game_title === gameFilter;
    return matchesSearch && matchesGame;
  });

  // Group resources by game
  const groupedResources = filteredResources.reduce((acc, resource) => {
    if (!acc[resource.game_title]) {
      acc[resource.game_title] = [];
    }
    acc[resource.game_title].push(resource);
    return acc;
  }, {} as Record<GameTitle, SimResource[]>);

  const handleCreate = () => {
    setSelectedResource(null);
    setEditDialogOpen(true);
  };

  const handleEdit = (resource: SimResource) => {
    setSelectedResource(resource);
    setEditDialogOpen(true);
  };

  const handleSave = (data: SimResourceInsert) => {
    if (selectedResource) {
      updateResource.mutate(
        { id: selectedResource.id, ...data },
        { onSuccess: () => setEditDialogOpen(false) }
      );
    } else {
      createResource.mutate(data, {
        onSuccess: () => setEditDialogOpen(false),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (resourceToDelete) {
      deleteResource.mutate(resourceToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setResourceToDelete(null);
        },
      });
    }
  };

  const handleToggleActive = (resource: SimResource) => {
    toggleActive.mutate({ id: resource.id, is_active: !resource.is_active });
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Link;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={gameFilter}
            onValueChange={(value) => setGameFilter(value as GameTitle | 'all')}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by game" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {Object.entries(GAME_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Resources grouped by game */}
      {Object.keys(GAME_CONFIG).map((gameKey) => {
        const game = gameKey as GameTitle;
        const gameResources = groupedResources[game] || [];
        const config = GAME_CONFIG[game];
        const GameIcon = config.icon;

        // Skip if filtering by a different game
        if (gameFilter !== 'all' && gameFilter !== game) return null;

        return (
          <div key={game} className="space-y-4">
            {/* Game Header */}
            <div className="flex items-center gap-3">
              <GameIcon className="h-5 w-5" style={{ color: config.color }} />
              <h3 className="font-semibold text-lg">{config.title}</h3>
              <Badge variant="secondary" className="ml-2">
                {gameResources.length} resource{gameResources.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Resource Cards */}
            {gameResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameResources.map((resource) => {
                  const ResourceIcon = getIcon(resource.icon_name);
                  return (
                    <div
                      key={resource.id}
                      className={`border rounded-lg p-4 transition-all ${
                        resource.is_active
                          ? 'bg-card border-border'
                          : 'bg-muted/50 border-border/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="p-2 rounded-lg shrink-0"
                            style={{ backgroundColor: `${resource.accent_color}20` }}
                          >
                            <ResourceIcon
                              className="h-5 w-5"
                              style={{ color: resource.accent_color }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium truncate">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {resource.description}
                              </p>
                            )}
                            <a
                              href={resource.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {new URL(resource.href).hostname}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={resource.is_active}
                            onCheckedChange={() => handleToggleActive(resource)}
                            aria-label="Toggle active"
                          />
                          <span className="text-xs text-muted-foreground">
                            {resource.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(resource)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setResourceToDelete(resource);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed rounded-lg p-8 text-center">
                <GameIcon className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-3">
                  No resources added for {config.title} yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedResource(null);
                    setEditDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Resource
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Dialog */}
      <SimResourceEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        resource={selectedResource}
        onSave={handleSave}
        isLoading={createResource.isPending || updateResource.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{resourceToDelete?.title}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
