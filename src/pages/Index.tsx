import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Award, Gamepad2, GraduationCap } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HorizontalCarousel } from '@/components/marketplace/HorizontalCarousel';
import { CourseCard } from '@/components/learn/CourseCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteMediaUrl } from '@/hooks/useSiteMedia';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace } from '@/hooks/useMarketplace';
import { MarketplaceRows } from '@/pages/Marketplace';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: market, isLoading: marketLoading } = useMarketplace();
  const heroImageUrl = useSiteMediaUrl('home_hero_image');

  if (authLoading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/workspace" replace />;

  return (
    <PublicLayout>
      <section className="relative flex min-h-[72vh] items-end overflow-hidden border-b border-border">
        <img src={heroImageUrl} alt="Simulation-based skills training" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-32 sm:px-6 sm:pb-20 lg:px-8">
          <p className="mb-4 font-data text-xs uppercase text-primary">One account. Every discipline.</p>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl">FGN Academy</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">Discover simulation-powered apps across maritime, rail, motorsports, construction and more, with one Skill Passport that follows you through all of them.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild><Link to="/apps" className="gap-2">Explore apps <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/auth">Sign in to learn</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-px border-x border-b border-border bg-border sm:grid-cols-3">
        {[
          { icon: GraduationCap, title: 'Learn with purpose', copy: 'Follow structured Courses built around practical, observable skills.' },
          { icon: Gamepad2, title: 'Practice through play', copy: 'Connect simulation activity to challenges that reflect real work.' },
          { icon: Award, title: 'Build your record', copy: 'Collect XP and trusted evidence in your Skill Passport as you progress.' },
        ].map((item) => (
          <div key={item.title} className="bg-card p-6 sm:p-8"><item.icon className="h-6 w-6 text-primary" /><h2 className="mt-5 font-display text-xl font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.copy}</p></div>
        ))}
      </section>

      <section className="container mx-auto px-4 pt-16">
        {marketLoading ? (
          <div className="flex gap-4 overflow-hidden">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-44 w-80 shrink-0 rounded-xl" />)}</div>
        ) : market ? <MarketplaceRows reg={market} /> : null}
      </section>

      <section className="container mx-auto px-4 py-16">
        {coursesLoading ? (
          <div className="flex gap-4 overflow-hidden">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-72 w-80 shrink-0 rounded-lg" />)}</div>
        ) : (
          <HorizontalCarousel
            title="Explore Courses"
            subtitle="Start with a Course that matches where you want to go"
            icon={<GraduationCap className="h-5 w-5" />}
            viewAllLink="/learn"
          >
            {courses.slice(0, 6).map((course) => (
              <div key={course.id} className="w-[85vw] shrink-0 snap-start sm:w-72 lg:w-80"><CourseCard course={course} /></div>
            ))}
          </HorizontalCarousel>
        )}
      </section>
    </PublicLayout>
  );
};

export default Index;
