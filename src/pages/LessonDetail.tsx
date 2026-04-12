import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLessonDetail, useSubmitQuiz, useNextLesson } from '@/hooks/useLessonProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, XCircle, Star, RotateCcw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LessonDetail() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useLessonDetail(lessonId);
  const submitQuiz = useSubmitQuiz();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ correct: number; total: number; pct: number; passed: boolean; xpEarned: number } | null>(null);

  const lesson = data?.lesson;
  const progress = data?.progress;
  const questions = (lesson?.content?.questions as any[]) || [];
  const courseIdResolved = courseId || (lesson?.modules as any)?.course_id;
  const moduleOrder = (lesson?.modules as any)?.order_index ?? 0;
  const lessonOrder = lesson?.order_index ?? 0;

  const { data: nextLesson } = useNextLesson(courseIdResolved, moduleOrder, lessonOrder);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !lesson) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <h2 className="text-xl font-semibold">Lesson not found</h2>
          <Button variant="outline" onClick={() => navigate(courseId ? `/learn/${courseId}` : '/learn')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
        </div>
      </AppLayout>
    );
  }

  const passingScore = lesson.passing_score ?? 70;
  const submitted = result !== null;
  const previouslyCompleted = progress?.status === 'completed';

  const handleSubmit = async () => {
    if (questions.length === 0) return;
    const res = await submitQuiz.mutateAsync({
      lessonId: lesson.id,
      answers,
      questions,
      passingScore,
      xpReward: lesson.xp_reward,
    });
    setResult(res);
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(courseId ? `/learn/${courseId}` : '/learn')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Course
        </Button>

        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">{(lesson.modules as any)?.title}</p>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="capitalize">{lesson.lesson_type}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-primary" /> {lesson.xp_reward} XP
            </span>
            <span className="text-sm text-muted-foreground">Pass: {passingScore}%</span>
            {previouslyCompleted && !submitted && (
              <Badge className="bg-primary">Completed</Badge>
            )}
          </div>
        </div>

        {/* Result banner */}
        {submitted && result && (
          <Card className={cn(
            'border-2',
            result.passed ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'
          )}>
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.passed ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-rose-500" />
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {result.passed ? 'Passed!' : 'Not Passed'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You scored {result.correct}/{result.total} ({result.pct}%)
                    {result.passed && ` — Earned ${result.xpEarned} XP`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {!result.passed && (
                  <Button variant="outline" onClick={handleRetry}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                )}
                {result.passed && nextLesson && (
                  <Button onClick={() => navigate(`/learn/${courseIdResolved}/lesson/${nextLesson.lessonId}`)}>
                    Next Lesson
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {result.passed && !nextLesson && (
                  <Button onClick={() => navigate(`/learn/${courseIdResolved}`)}>
                    Back to Course
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz questions */}
        {lesson.lesson_type === 'quiz' && questions.length > 0 && (
          <div className="space-y-4">
            {questions.map((q, qIdx) => {
              const selected = answers[q.id];
              const isCorrect = submitted ? selected === q.correct_index : undefined;

              return (
                <Card key={q.id} className={cn(
                  submitted && isCorrect === true && 'border-emerald-500/30',
                  submitted && isCorrect === false && 'border-rose-500/30',
                )}>
                  <CardHeader className="pb-2">
                    <p className="font-medium text-sm">
                      <span className="text-muted-foreground mr-2">Q{qIdx + 1}.</span>
                      {q.question}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RadioGroup
                      value={selected !== undefined ? String(selected) : undefined}
                      onValueChange={(v) => {
                        if (!submitted) setAnswers((prev) => ({ ...prev, [q.id]: parseInt(v) }));
                      }}
                      disabled={submitted}
                    >
                      {q.options.map((opt: string, oIdx: number) => {
                        const isThisCorrect = oIdx === q.correct_index;
                        const isThisSelected = selected === oIdx;

                        return (
                          <div
                            key={oIdx}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 border',
                              !submitted && 'border-border',
                              submitted && isThisCorrect && 'border-emerald-500/50 bg-emerald-500/5',
                              submitted && isThisSelected && !isThisCorrect && 'border-rose-500/50 bg-rose-500/5',
                              submitted && !isThisCorrect && !isThisSelected && 'border-border opacity-60',
                            )}
                          >
                            <RadioGroupItem value={String(oIdx)} id={`${q.id}-${oIdx}`} />
                            <Label htmlFor={`${q.id}-${oIdx}`} className="flex-1 cursor-pointer text-sm">
                              {opt}
                            </Label>
                            {submitted && isThisCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                            {submitted && isThisSelected && !isThisCorrect && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </RadioGroup>

                    {submitted && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        <span className="font-medium">Explanation:</span> {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {!submitted && (
              <Button
                className="w-full"
                size="lg"
                disabled={!allAnswered || submitQuiz.isPending}
                onClick={handleSubmit}
              >
                {submitQuiz.isPending ? 'Submitting...' : 'Submit Quiz'}
              </Button>
            )}
          </div>
        )}

        {/* Non-quiz placeholder */}
        {lesson.lesson_type !== 'quiz' && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>This {lesson.lesson_type} lesson content will be available soon.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
