import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, PlayCircle, Loader2, ExternalLink, Layers } from 'lucide-react';
import { useScormCoursesBundling, type ScormBundleCourseRow } from '@/hooks/useScormCoursesBundling';

interface Props {
  workOrderId: string;
  /** "inline" renders bare rows (no Card chrome) for embedding in another card. */
  variant?: 'card' | 'inline';
}

export function LearningResourcesCard({ workOrderId, variant = 'card' }: Props) {
  // Now sourced from the bundling hook so we can render the
  // "Part of N-challenge bundle" badge + apply G5 sort order.
  const { data: courses, isLoading } = useScormCoursesBundling(workOrderId);

  const inline = variant === 'inline';

  if (isLoading) {
    if (inline) {
      return (
        <div className="text-xs text-muted-foreground flex items-center gap-2 px-1 py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading SCORM courses…
        </div>
      );
    }
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

  const rows = (
    <>
      {courses.map((c) => (
        <CourseRow key={c.id} course={c} />
      ))}
    </>
  );

  if (inline) return <div className="space-y-2">{rows}</div>;

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
      <CardContent className="space-y-3">{rows}</CardContent>
    </Card>
  );
}

function CourseRow({ course: c }: { course: ScormBundleCourseRow }) {
  const isBundle = c.bundleSize > 1;
  return (
    <div className="flex items-stretch gap-3 rounded-lg border border-border bg-muted/20 overflow-hidden hover:bg-muted/30 transition-colors">
      {c.cover_image_url ? (
        <img src={c.cover_image_url} alt={c.title} className="w-20 h-20 object-cover shrink-0" />
      ) : (
        <div className="w-20 h-20 shrink-0 bg-muted flex items-center justify-center">
          <BookOpen className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 p-2.5 flex flex-col gap-1">
        <div className="flex items-start gap-2 flex-wrap">
          <h4 className="font-semibold text-sm truncate flex-1 min-w-0">{c.title}</h4>
          {isBundle && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono shrink-0 border-primary/40 text-primary"
              title={c.isLead ? 'This Work Order is the bundle lead' : 'This Work Order is part of the bundle'}
            >
              <Layers className="h-3 w-3 mr-1" />
              Part of {c.bundleSize}-challenge bundle
              {c.isLead ? ' · lead' : ''}
            </Badge>
          )}
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
  );
}
