import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BookOpen, ExternalLink, Loader2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CourseRow {
  id: string;
  title: string;
  difficulty_level: string | null;
  xp_reward: number | null;
  is_published: boolean | null;
  lessonCount: number;
}

export function CommunityCoursesPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['community-courses', tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, difficulty_level, xp_reward, is_published')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) return [];

      const { data: modules } = await supabase
        .from('modules')
        .select('id, course_id')
        .in('course_id', rows.map((c) => c.id));

      const moduleIds = (modules ?? []).map((m) => m.id);
      const moduleToCourse = new Map((modules ?? []).map((m) => [m.id, m.course_id]));

      const counts = new Map<string, number>();
      if (moduleIds.length > 0) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id, module_id')
          .in('module_id', moduleIds);
        for (const l of lessons ?? []) {
          const courseId = moduleToCourse.get(l.module_id);
          if (courseId) counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
        }
      }

      return rows.map((c) => ({ ...c, lessonCount: counts.get(c.id) ?? 0 }));
    },
  });

  const togglePublished = async (id: string, next: boolean) => {
    const { error } = await supabase.from('courses').update({ is_published: next }).eq('id', id);
    if (error) {
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['community-courses', tenantId] });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Courses
          </CardTitle>
          <CardDescription>
            Courses owned by this community. Publishing makes a course visible to members.
          </CardDescription>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/admin/course-builder">
            <Plus className="h-4 w-4" /> Build course
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading courses…
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No courses yet. Build one from a work order to get started.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {c.difficulty_level && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.difficulty_level}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{c.lessonCount} steps</span>
                    <span className="text-xs text-muted-foreground">{c.xp_reward ?? 0} XP</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!c.is_published}
                      onCheckedChange={(v) => togglePublished(c.id, v)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {c.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <Link to={`/learn/${c.id}`}>
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
