import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Image, Video, Music, Youtube, LayoutGrid, List } from 'lucide-react';
import { useAllSiteMedia, type SiteMedia } from '@/hooks/useSiteMedia';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { MediaCard } from './MediaCard';
import { MediaUploadDialog } from './MediaUploadDialog';
import { MediaEditDialog } from './MediaEditDialog';

type MediaFilter = 'all' | 'image' | 'video' | 'youtube' | 'audio';

export function MediaLibrary() {
  const { data: allMedia, isLoading } = useAllSiteMedia();
  const { updateMedia, deleteMedia } = useMediaLibrary();

  const [filter, setFilter] = useState<MediaFilter>('all');
  const [search, setSearch] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingMedia, setEditingMedia] = useState<SiteMedia | null>(null);

  const filteredMedia = useMemo(() => {
    if (!allMedia) return [];

    return allMedia.filter((media) => {
      // Type filter
      if (filter !== 'all' && media.media_type !== filter) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          media.title.toLowerCase().includes(searchLower) ||
          media.location_key.toLowerCase().includes(searchLower) ||
          media.alt_text?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [allMedia, filter, search]);

  const mediaTypeCounts = useMemo(() => {
    if (!allMedia) return { image: 0, video: 0, youtube: 0, audio: 0 };
    
    return allMedia.reduce(
      (acc, media) => {
        acc[media.media_type] = (acc[media.media_type] || 0) + 1;
        return acc;
      },
      { image: 0, video: 0, youtube: 0, audio: 0 } as Record<string, number>
    );
  }, [allMedia]);

  const existingLocationKeys = allMedia?.map((m) => m.location_key) || [];

  const handleDelete = async (id: string) => {
    await deleteMedia.mutateAsync(id);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateMedia.mutateAsync({ id, is_active: isActive });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-muted-foreground text-sm">
            Manage images, videos, and audio across the platform
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Media
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
            <Badge variant="secondary" className="ml-2">
              {allMedia?.length || 0}
            </Badge>
          </Button>
          <Button
            variant={filter === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('image')}
            className="gap-1"
          >
            <Image className="h-3 w-3" />
            Images
            <Badge variant="secondary" className="ml-1">
              {mediaTypeCounts.image}
            </Badge>
          </Button>
          <Button
            variant={filter === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('youtube')}
            className="gap-1"
          >
            <Youtube className="h-3 w-3" />
            YouTube
            <Badge variant="secondary" className="ml-1">
              {mediaTypeCounts.youtube}
            </Badge>
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('video')}
            className="gap-1"
          >
            <Video className="h-3 w-3" />
            Videos
            <Badge variant="secondary" className="ml-1">
              {mediaTypeCounts.video}
            </Badge>
          </Button>
          <Button
            variant={filter === 'audio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('audio')}
            className="gap-1"
          >
            <Music className="h-3 w-3" />
            Audio
            <Badge variant="secondary" className="ml-1">
              {mediaTypeCounts.audio}
            </Badge>
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No media found</p>
          {search && (
            <Button variant="link" onClick={() => setSearch('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              onEdit={setEditingMedia}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <MediaUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        existingLocationKeys={existingLocationKeys}
      />

      <MediaEditDialog
        open={!!editingMedia}
        onOpenChange={(open) => !open && setEditingMedia(null)}
        media={editingMedia}
      />
    </div>
  );
}
