import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, LayoutGrid, Trophy } from 'lucide-react';
import { AcademyLayout } from '@/components/layout/AcademyLayout';
import { HorizontalCarousel, DEFAULT_CARD_WIDTH } from '@/components/marketplace/HorizontalCarousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMarketplace, launchTarget, STATUS_LABEL, ACCESS_LABEL, LAUNCH_LABEL,
  type MarketplaceApp, type Discipline, type MarketplaceRegistry,
} from '@/hooks/useMarketplace';
import type { RegistryProgram } from '@/hooks/usePrograms';
import { SIM_RESOURCES } from '@/config/simResources';
import type { GameTitle } from '@/types/tenant';

const gameName = (g: string) => SIM_RESOURCES[g as GameTitle]?.title ?? g.replace(/_/g, ' ');

export function AppCard({ app, disciplines }: { app: MarketplaceApp; disciplines: Discipline[] }) {
  const primary = disciplines.find((d) => d.key === app.disciplines[0]);
  return (
    <Link
      to={`/apps/${app.key}`}
      className="glass-card group flex h-full flex-col gap-3 rounded-xl border border-border p-5 transition-colors hover:border-primary/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: app.accent_color ?? undefined }} />
        <Badge variant="outline">{LAUNCH_LABEL[app.launch_type]}</Badge>
        <Badge variant={app.status === 'live' ? 'default' : 'secondary'}>{STATUS_LABEL[app.status]}</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">{app.name}</h3>
      {app.tagline && <p className="text-sm text-muted-foreground">{app.tagline}</p>}
      <p className="mt-auto text-xs text-muted-foreground">
        {primary?.name}
        {app.disciplines.length > 1 && ` + ${app.disciplines.length - 1} more`}
      </p>
    </Link>
  );
}

export function CompetitionCard({ src }: { src: RegistryProgram }) {
  return (
    <a
      href={src.canonical_url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="glass-card flex h-full flex-col gap-3 rounded-xl border border-border p-5 transition-colors hover:border-primary/60"
    >
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <Badge variant="outline">Competition</Badge>
      </div>
      <h3 className="font-display text-xl font-semibold">{src.name}</h3>
      {src.tagline && <p className="text-sm text-muted-foreground">{src.tagline}</p>}
      <p className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
        Challenge progress counts in your Skill Passport <ArrowUpRight className="h-3 w-3" />
      </p>
    </a>
  );
}

/** Marketplace carousels: featured first, then one row per discipline. Reused on the home page. */
export function MarketplaceRows({ reg }: { reg: MarketplaceRegistry }) {
  const featured = reg.applications.filter((a) => a.featured);
  return (
    <div className="space-y-12">
      {featured.length > 0 && (
        <HorizontalCarousel title="Featured apps" subtitle="Hand-picked places to start" icon={<LayoutGrid className="h-5 w-5" />} viewAllLink="/apps">
          {featured.map((a) => (
            <div key={a.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><AppCard app={a} disciplines={reg.disciplines} /></div>
          ))}
        </HorizontalCarousel>
      )}
      {reg.disciplines.map((d) => {
        const apps = reg.applications.filter((a) => a.disciplines.includes(d.key));
        if (apps.length === 0) return null;
        return (
          <HorizontalCarousel key={d.key} title={d.name} subtitle={d.tagline ?? undefined} viewAllLink={`/disciplines/${d.key}`}>
            {apps.map((a) => (
              <div key={a.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><AppCard app={a} disciplines={reg.disciplines} /></div>
            ))}
          </HorizontalCarousel>
        );
      })}
      {reg.competitionSources.length > 0 && (
        <HorizontalCarousel title="Compete, then build skills" subtitle="Challenge progress on these sites flows into your Academy record" icon={<Trophy className="h-5 w-5" />}>
          {reg.competitionSources.map((s) => (
            <div key={s.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><CompetitionCard src={s} /></div>
          ))}
        </HorizontalCarousel>
      )}
    </div>
  );
}

function LoadingRows() {
  return <div className="flex gap-4 overflow-hidden">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-80 shrink-0 rounded-xl" />)}</div>;
}

export function AppsDirectory() {
  const { data, isLoading, error } = useMarketplace();
  const [discipline, setDiscipline] = useState<string>('all');
  const [access, setAccess] = useState<string>('all');
  const filtered = useMemo(
    () => (data?.applications ?? []).filter(
      (a) => (discipline === 'all' || a.disciplines.includes(discipline)) && (access === 'all' || a.access_terms === access),
    ),
    [data, discipline, access],
  );
  const filtering = discipline !== 'all' || access !== 'all';

  return (
    <AcademyLayout>
      <section className="container mx-auto px-4 py-10">
        <h1 className="font-display text-4xl font-bold">FGN Academy apps</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Find the app for the discipline you want to grow in. One account and one Skill Passport go with you across all of them.
          Browsing never changes your organization or access.
        </p>

        {data && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="sm" variant={discipline === 'all' ? 'default' : 'outline'} onClick={() => setDiscipline('all')}>All disciplines</Button>
            {data.disciplines.map((d) => (
              <Button key={d.key} size="sm" variant={discipline === d.key ? 'default' : 'outline'} onClick={() => setDiscipline(d.key)}>{d.name}</Button>
            ))}
            <span className="mx-2 hidden w-px bg-border sm:block" />
            {(['all', 'open', 'sign_in', 'organization_invite'] as const).map((k) => (
              <Button key={k} size="sm" variant={access === k ? 'secondary' : 'ghost'} onClick={() => setAccess(k)}>
                {k === 'all' ? 'Any access' : ACCESS_LABEL[k]}
              </Button>
            ))}
          </div>
        )}

        <div className="mt-10">
          {isLoading && <LoadingRows />}
          {error && <p className="text-destructive">The app list is unavailable right now.</p>}
          {data && !filtering && <MarketplaceRows reg={data} />}
          {data && filtering && (
            filtered.length === 0 ? <p className="text-muted-foreground">No apps match these filters yet.</p> : (
              <HorizontalCarousel title={`${filtered.length} app${filtered.length === 1 ? '' : 's'}`}>
                {filtered.map((a) => (
                  <div key={a.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><AppCard app={a} disciplines={data.disciplines} /></div>
                ))}
              </HorizontalCarousel>
            )
          )}
        </div>
      </section>
    </AcademyLayout>
  );
}

export function DisciplinePage() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = useMarketplace();
  const d = data?.disciplines.find((x) => x.key === key);
  const apps = (data?.applications ?? []).filter((a) => key && a.disciplines.includes(key));
  const games = [...new Set(apps.flatMap((a) => a.games))];

  return (
    <AcademyLayout>
      <section className="container mx-auto px-4 py-10">
        <Button variant="ghost" asChild className="mb-4 gap-2"><Link to="/apps"><ArrowLeft className="h-4 w-4" /> All apps</Link></Button>
        {isLoading && <Skeleton className="h-48 rounded-xl" />}
        {!isLoading && !d && <p className="text-muted-foreground">This discipline isn't available.</p>}
        {d && data && (
          <div className="space-y-10">
            <div>
              <Badge variant="outline">Discipline</Badge>
              <h1 className="mt-3 font-display text-4xl font-bold">{d.name}</h1>
              {d.tagline && <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{d.tagline}</p>}
              {d.description && <p className="mt-2 max-w-2xl text-muted-foreground">{d.description}</p>}
            </div>
            <HorizontalCarousel title="Apps in this discipline">
              {apps.map((a) => (
                <div key={a.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><AppCard app={a} disciplines={data.disciplines} /></div>
              ))}
            </HorizontalCarousel>
            {games.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold">Simulations used</h2>
                <div className="mt-2 flex flex-wrap gap-2">{games.map((g) => <Badge key={g} variant="secondary">{gameName(g)}</Badge>)}</div>
              </div>
            )}
            {games.length > 0 && data.competitionSources.length > 0 && (
              <HorizontalCarousel title="Competition" subtitle="Challenges in these simulations count toward your record here" icon={<Trophy className="h-5 w-5" />}>
                {data.competitionSources.map((s) => (
                  <div key={s.key} className={`${DEFAULT_CARD_WIDTH} shrink-0 snap-start`}><CompetitionCard src={s} /></div>
                ))}
              </HorizontalCarousel>
            )}
          </div>
        )}
      </section>
    </AcademyLayout>
  );
}

export function AppDetail() {
  const { key } = useParams<{ key: string }>();
  const { data, isLoading } = useMarketplace();
  const app = data?.applications.find((a) => a.key === key);
  const competition = data?.competitionSources.find((s) => s.key === key);

  if (!isLoading && !app && competition) {
    return (
      <AcademyLayout>
        <section className="container mx-auto max-w-xl px-4 py-10"><CompetitionCard src={competition} /></section>
      </AcademyLayout>
    );
  }

  const discs = (app?.disciplines ?? []).map((k) => data?.disciplines.find((d) => d.key === k)).filter(Boolean) as Discipline[];
  const target = app ? launchTarget(app) : null;
  const services = app ? Object.entries(app.shared_services) : [];

  return (
    <AcademyLayout>
      <section className="container mx-auto px-4 py-10">
        <Button variant="ghost" asChild className="mb-4 gap-2"><Link to="/apps"><ArrowLeft className="h-4 w-4" /> All apps</Link></Button>
        {isLoading && <Skeleton className="h-48 rounded-xl" />}
        {!isLoading && !app && <p className="text-muted-foreground">This app isn't available.</p>}
        {app && target && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{LAUNCH_LABEL[app.launch_type]}</Badge>
              <Badge variant={app.status === 'live' ? 'default' : 'secondary'}>{STATUS_LABEL[app.status]}</Badge>
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold">{app.name}</h1>
              {app.tagline && <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{app.tagline}</p>}
              {app.description && <p className="mt-2 max-w-2xl text-muted-foreground">{app.description}</p>}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h2 className="font-data text-xs uppercase text-muted-foreground">Disciplines</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {discs.map((d) => <Link key={d.key} to={`/disciplines/${d.key}`}><Badge variant="secondary">{d.name}</Badge></Link>)}
                </div>
              </div>
              <div>
                <h2 className="font-data text-xs uppercase text-muted-foreground">Access</h2>
                <p className="mt-2 text-sm">{ACCESS_LABEL[app.access_terms]}</p>
                <p className="mt-1 text-xs text-muted-foreground">An FGN Academy account doesn't by itself open private programs.</p>
              </div>
              <div>
                <h2 className="font-data text-xs uppercase text-muted-foreground">Connected to your Academy record</h2>
                {services.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Not yet confirmed</p> : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {services.map(([k, v]) => (
                      <li key={k}>{k.replace(/_/g, ' ')}: <span className="text-muted-foreground">{v === 'unverified' ? 'not yet confirmed' : v}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {app.games.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold">Simulations used</h2>
                <div className="mt-2 flex flex-wrap gap-2">{app.games.map((g) => <Badge key={g} variant="secondary">{gameName(g)}</Badge>)}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {app.status === 'coming_soon' ? (
                <Button disabled>Coming soon</Button>
              ) : target.external ? (
                <Button asChild className="gap-2">
                  <a href={target.href} target="_blank" rel="noopener noreferrer">Launch {app.short_name ?? app.name} <ArrowUpRight className="h-4 w-4" /></a>
                </Button>
              ) : (
                <Button asChild><Link to={target.href}>Launch {app.short_name ?? app.name}</Link></Button>
              )}
            </div>
          </div>
        )}
      </section>
    </AcademyLayout>
  );
}

/** Old program addresses keep working. */
export function ProgramsRedirect() {
  const { key } = useParams<{ key: string }>();
  return <Navigate to={key ? `/apps/${key}` : '/apps'} replace />;
}
