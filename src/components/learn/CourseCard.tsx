import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, GraduationCap, Star, Users } from 'lucide-react';
import type { Course } from '@/types/lms';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  advanced: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export function CourseCard({ course, showProgress = false }: CourseCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
      {/* Cover Image */}
      <div className="relative h-40 overflow-hidden">
        {course.cover_image_url ? (
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-primary/50" />
          </div>
        )}
        
        {/* Difficulty Badge */}
        <Badge
          variant="outline"
          className={cn(
            'absolute top-3 right-3 capitalize',
            DIFFICULTY_COLORS[course.difficulty_level]
          )}
        >
          {course.difficulty_level}
        </Badge>

        {/* Enrolled Badge */}
        {course.enrolled && (
          <Badge className="absolute top-3 left-3 bg-primary">
            Enrolled
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
      </CardHeader>

      <CardContent className="pb-3">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{course.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-primary" />
            <span>{course.xp_reward} XP</span>
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && course.progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={course.enrolled ? 'secondary' : 'default'}
          onClick={() => navigate(`/learn/${course.id}`)}
        >
          {course.enrolled ? 'Continue Learning' : 'View Course'}
        </Button>
      </CardFooter>
    </Card>
  );
}
