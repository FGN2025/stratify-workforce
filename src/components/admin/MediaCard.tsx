import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Image, Video, Music, Youtube, MoreVertical, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import type { SiteMedia } from '@/hooks/useSiteMedia';
import { cn } from '@/lib/utils';

interface MediaCardProps {
  media: SiteMedia;
  onEdit: (media: SiteMedia) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

const mediaTypeIcons = {
  image: Image,
  video: Video,
  youtube: Youtube,
  audio: Music,
};

const mediaTypeColors = {
  image: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  video: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  youtube: 'bg-red-500/20 text-red-500 border-red-500/30',
  audio: 'bg-green-500/20 text-green-500 border-green-500/30',
};

export function MediaCard({ media, onEdit, onDelete, onToggleActive }: MediaCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const Icon = mediaTypeIcons[media.media_type];

  const renderPreview = () => {
    if (media.media_type === 'image') {
      return (
        <img
          src={media.url}
          alt={media.alt_text || media.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      );
    }

    if (media.media_type === 'youtube') {
      // Show YouTube thumbnail
      const videoId = media.url.length === 11 ? media.url : media.url.split('/').pop();
      return (
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={media.title}
          className="w-full h-full object-cover"
        />
      );
    }

    // Fallback for video/audio
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <>
      <Card className={cn(
        "group overflow-hidden transition-all hover:border-primary/50",
        !media.is_active && "opacity-60"
      )}>
        {/* Preview */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {renderPreview()}
          
          {/* Overlay with type badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className={cn("gap-1", mediaTypeColors[media.media_type])}>
              <Icon className="h-3 w-3" />
              {media.media_type}
            </Badge>
          </div>

          {/* Active status indicator */}
          {!media.is_active && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="gap-1">
                <EyeOff className="h-3 w-3" />
                Inactive
              </Badge>
            </div>
          )}

          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => onEdit(media)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{media.title}</h4>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {media.location_key}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(media)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleActive(media.id, !media.is_active)}>
                  {media.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{media.title}"? This action cannot be undone.
              The location key "{media.location_key}" will no longer have an assigned media.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(media.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
