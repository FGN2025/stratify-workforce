import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, Loader2, ExternalLink } from 'lucide-react';

interface Props {
  workOrderId: string;
}

interface ScormCourseRow {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  destination: string;
  scorm_version: string;
  zip_url: string | null;
  is_published: boolean;
  published_at: string | null;
}

export function LearningResourcesCard({ workOrderId }: Props) {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['wo-scorm-courses', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scorm_courses')
        .select('id, title, description, cover_image_url, destination, scorm_version, zip_url, is_published, published_at')
        .eq('work_order_id', workOrderId)
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScormCourseRow[];
    },
    enabled: !!workOrderId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" /> Learning Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  if (!courses || courses.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-5 w-5 text-primary" /> Learning Resources
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {courses.map((c) => (
          <div
            key={c.id}
            className="flex items-stretch gap-3 rounded-lg border border-border bg-muted/20 overflow-hidden hover:bg-muted/30 transition-colors"
          >
            {c.cover_image_url ? (
              <img src={c.cover_image_url} alt={c.title} className="w-24 h-24 object-cover shrink-0" />
            ) : (
              <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0 p-3 flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <h4 className="font-semibold text-sm truncate flex-1">{c.title}</h4>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  SCORM {c.scorm_version}
                </Badge>
              </div>
              {c.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              )}
              <div className="flex items-center gap-2 mt-auto pt-1">
                <Button asChild size="sm" className="h-7 text-xs">
                  <Link to={`/scorm-player/${c.id}/launch`}>
                    <PlayCircle className="h-3 w-3 mr-1" /> Launch Course
                  </Link>
                </Button>
                {c.zip_url && (
                  <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                    <a href={c.zip_url} target="_blank" rel="noreferrer">
                      SCORM ZIP <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
