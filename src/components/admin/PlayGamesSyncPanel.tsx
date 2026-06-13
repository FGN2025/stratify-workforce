import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCcw, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type DiffRow = {
  play_id: string | null;
  play_name: string | null;
  play_slug: string | null;
  academy_enum: string | null;
  academy_name: string | null;
  status: 'synced' | 'missing_on_academy' | 'missing_on_play' | 'name_mismatch';
};

type CatalogResponse = {
  play_count?: number;
  academy_count?: number;
  diff?: DiffRow[];
  error?: string;
  status?: number;
  body?: string;
};

export function PlayGamesSyncPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErrorDetail(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('play-games-catalog', {
        method: 'POST',
      });
      if (error) {
        setErrorDetail(error.message);
        setData(res ?? null);
      } else {
        setData(res ?? null);
      }
    } catch (e) {
      setErrorDetail(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyMigrationTemplate = (row: DiffRow) => {
    const enumName = (row.play_name ?? row.play_slug ?? 'NewGame')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const sql = `-- Migration 1: add enum value (must be alone, separate transaction)
ALTER TYPE public.game_title ADD VALUE IF NOT EXISTS '${enumName}';

-- Migration 2 (separate file): channel row + frontend wiring follows
INSERT INTO public.game_channels (game_title, name, accent_color, description)
VALUES ('${enumName}', '${row.play_name ?? enumName}', '#888888',
        'play.fgn.gg game_id: ${row.play_id ?? ''}');

-- Frontend files to update for this game:
--   src/components/dashboard/GameIcon.tsx
--   src/config/simResources.ts
--   src/hooks/useGameChannelColors.ts
--   src/components/admin/ImportChallengeDialog.tsx (GAME_NAME_MAP)
--   src/components/layout/AppSidebar.tsx (GAME_ORDER)
--   src/components/admin/SimGamesManager.tsx (gameLabels, gameIcons)
--   src/components/admin/SimResourcesManager.tsx (GAME_CONFIG)
--   supabase/functions/public-catalog/index.ts
`;
    navigator.clipboard.writeText(sql);
    toast({ title: 'Copied migration template', description: `Enum name: ${enumName}` });
  };

  const playEndpointBroken =
    data?.error?.toLowerCase().includes('play games fetch failed') ||
    (errorDetail?.toLowerCase().includes('column games.key does not exist') ?? false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display tracking-wide">Play Games Sync</h2>
          <p className="text-sm text-muted-foreground">
            Diff play.fgn.gg's game catalog against academy's <code>game_channels</code>.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline">
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {playEndpointBroken && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>play.fgn.gg games endpoint is currently failing</AlertTitle>
          <AlertDescription>
            The <code>ecosystem-data-api</code> games action returned{' '}
            <code>column games.key does not exist</code>. This is a bug on play's side; ping
            play's owner to fix the SELECT in their games handler. Until then this page can
            only show academy's locally-known games (below).
          </AlertDescription>
        </Alert>
      )}

      {errorDetail && !playEndpointBroken && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Catalog fetch failed</AlertTitle>
          <AlertDescription className="font-mono text-xs">{errorDetail}</AlertDescription>
        </Alert>
      )}

      {data && (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-3 flex gap-4">
            <span>play.fgn.gg: <strong>{data.play_count ?? 0}</strong></span>
            <span>academy: <strong>{data.academy_count ?? 0}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-4">play.fgn.gg game</th>
                  <th className="py-2 pr-4">play game_id</th>
                  <th className="py-2 pr-4">academy enum</th>
                  <th className="py-2 pr-4">academy name</th>
                  <th className="py-2 pr-4">status</th>
                  <th className="py-2 pr-4">action</th>
                </tr>
              </thead>
              <tbody>
                {(data.diff ?? []).map((row, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2 pr-4">{row.play_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {row.play_id ? row.play_id.slice(0, 8) + '…' : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs">
                      {row.academy_enum ?? <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-4">{row.academy_name ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="py-2 pr-4">
                      {row.status === 'synced' && (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          synced
                        </Badge>
                      )}
                      {row.status === 'name_mismatch' && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                          name mismatch
                        </Badge>
                      )}
                      {row.status === 'missing_on_academy' && (
                        <Badge variant="outline" className="text-rose-500 border-rose-500/30">
                          missing on academy
                        </Badge>
                      )}
                      {row.status === 'missing_on_play' && (
                        <Badge variant="outline" className="text-sky-500 border-sky-500/30">
                          academy-only
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {row.status === 'missing_on_academy' && (
                        <Button size="sm" variant="outline" onClick={() => copyMigrationTemplate(row)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy migration
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data.diff || data.diff.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      No games to display.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
