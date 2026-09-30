import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ArrowLeft } from 'lucide-react';
import { AcademyLayout } from '@/components/layout/AcademyLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrograms, type RegistryProgram } from '@/hooks/usePrograms';
import { SIM_RESOURCES } from '@/config/simResources';
import type { GameTitle } from '@/types/tenant';

const KIND_LABEL: Record<RegistryProgram['kind'], string> = {
  game: 'Game program',
  trade: 'Trade path',
  industry: 'Industry',
  vertical: 'FGN program',
  competition_source: 'Competition',
};
const AVAIL_LABEL = { live: 'Live', preview: 'Preview', coming_soon: 'Coming soon' } as const;

const gameName = (g: string) => SIM_RESOURCES[g as GameTitle]?.title ?? g.replace(/_/g, ' ');

function ProgramCard({ p }: { p: RegistryProgram }) {
  return (
    <Link
      to={`/programs/${p.key}`}
      className="glass-card group flex h-full flex-col gap-3 rounded-xl border border-border p-5 transition-colors hover:border-primary/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.accent_color ?? undefined }} />
        <Badge variant="outline">{KIND_LABEL[p.kind]}</Badge>
        <Badge variant={p.availability === 'live' ? 'default' : 'secondary'}>{AVAIL_LABEL[p.availability]}</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">{p.name}</h3>
      {p.tagline && <p className="text-sm text-muted-foreground">{p.tagline}</p>}
      {p.games.length > 0 && (
        <p className="mt-auto text-xs text-muted-foreground">
          {p.games.length === 1 ? gameName(p.games[0]) : `${p.games.length} games`}
        </p>
      )}
    </Link>
  );
}

export function ProgramsDirectory() {
  const { data, isLoading, error } = usePrograms();
  const academy = (data ?? []).filter((p) => p.is_academy_program);
  const sources = (data ?? []).filter((p) => !p.is_academy_program);

  return (
    <AcademyLayout>
      <section className="container mx-auto px-4 py-10">
        <h1 className="font-display text-4xl font-bold">Programs</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Browse FGN programs by game, trade, industry, or vertical. Your skills count across all of them.
          Browsing a program does not change your organization or access.
        </p>

        {isLoading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        )}
        {error && <p className="mt-8 text-destructive">The program list is unavailable right now.</p>}

        {!isLoading && !error && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {academy.map((p) => <ProgramCard key={p.key} p={p} />)}
            </div>
            {sources.length > 0 && (
              <>
                <h2 className="mt-12 font-display text-2xl font-semibold">Compete, then build skills</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Challenge progress on these sites flows into your Academy assignments and Skill Passport.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sources.map((p) => <ProgramCard key={p.key} p={p} />)}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </AcademyLayout>
  );
}

export function ProgramDetail() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = usePrograms();
  const p = data?.find((x) => x.key === key);

  return (
    <AcademyLayout>
      <section className="container mx-auto px-4 py-10">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/programs"><ArrowLeft className="h-4 w-4" /> All programs</Link>
        </Button>
        {isLoading && <Skeleton className="h-48 rounded-xl" />}
        {!isLoading && !p && <p className="text-muted-foreground">This program is not available.</p>}
        {p && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{KIND_LABEL[p.kind]}</Badge>
              <Badge variant={p.availability === 'live' ? 'default' : 'secondary'}>{AVAIL_LABEL[p.availability]}</Badge>
            </div>
            <h1 className="font-display text-4xl font-bold">{p.name}</h1>
            {p.tagline && <p className="max-w-2xl text-lg text-muted-foreground">{p.tagline}</p>}

            {p.games.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold">Games</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.games.map((g) => <Badge key={g} variant="secondary">{gameName(g)}</Badge>)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {p.canonical_url ? (
                <Button asChild className="gap-2">
                  <a href={p.canonical_url} target="_blank" rel="noopener noreferrer">
                    Visit {p.short_name ?? p.name} (another FGN site) <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button asChild><Link to="/learn">Browse Courses</Link></Button>
              )}
            </div>
          </div>
        )}
      </section>
    </AcademyLayout>
  );
}
