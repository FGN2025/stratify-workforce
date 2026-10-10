import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ImageOff, Sparkles, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarketplace, type MarketplaceApp } from '@/hooks/useMarketplace';

export const STUDIO_ORIGIN = 'https://studio.fgn.gg';

/** Builds the Studio launch link with the app, primary discipline and allowed simulations pre-selected. */
export function studioLaunchUrl(app: Pick<MarketplaceApp, 'key' | 'disciplines' | 'games'>): string {
  const p = new URLSearchParams({ app: app.key, source: 'fgn-academy' });
  if (app.disciplines[0]) p.set('discipline', app.disciplines[0]);
  if (app.games.length) p.set('games', app.games.join(','));
  return `${STUDIO_ORIGIN}/new?${p.toString()}`;
}

export default function CreateInStudio() {
  const { data, isLoading } = useMarketplace();
  const disciplines = data?.disciplines ?? [];
  const apps = data?.applications ?? [];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">Create in Studio</h1>
              <p className="text-sm text-muted-foreground">
                Pick the industry app first. Studio authors the challenge, Work Order or Course once and sends it to
                FGN.GG, FGN Academy, or both. Anything sent here waits in the Review Inbox until you publish it.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/studio-submissions"><Inbox className="h-4 w-4 mr-2" />Open Review Inbox</Link>
          </Button>
        </header>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        )}

        {disciplines.map((d) => {
          const inD = apps.filter((a) => a.disciplines[0] === d.key);
          if (!inD.length) return null;
          return (
            <section key={d.key} className="space-y-3">
              <h2 className="font-display text-lg font-semibold">{d.name}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inD.map((app) => (
                  <Card key={app.key} className="overflow-hidden border-border/60 bg-card/40">
                    <div className="aspect-video bg-muted relative">
                      {app.hero_image_url ? (
                        <img src={app.hero_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold">{app.name}</h3>
                        {app.tagline && <p className="text-xs text-muted-foreground line-clamp-2">{app.tagline}</p>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {app.games.length ? app.games.map((g) => (
                          <Badge key={g} variant="secondary" className="font-mono text-[10px]">{g}</Badge>
                        )) : <span className="text-xs text-muted-foreground">No simulations linked yet</span>}
                      </div>
                      <Button asChild size="sm" className="w-full">
                        <a href={studioLaunchUrl(app)} target="_blank" rel="noopener noreferrer">
                          Author in Studio <ExternalLink className="h-3.5 w-3.5 ml-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppLayout>
  );
}
