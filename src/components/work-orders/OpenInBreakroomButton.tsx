import { useState } from 'react';
import { Boxes, ExternalLink, Link2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { hasSpatialTask } from './SpatialTaskBadge';

interface OpenInBreakroomButtonProps {
  metadata: Record<string, unknown> | null | undefined;
}

const DEFAULT_BREAKROOM_URL = 'https://curator.sine.space';

function resolveLaunchUrl(metadata: Record<string, unknown> | null | undefined): string {
  if (metadata && typeof metadata.breakroom_room_url === 'string') {
    return metadata.breakroom_room_url as string;
  }
  return DEFAULT_BREAKROOM_URL;
}

/**
 * Renders a launch button when this work order has a Breakroom (spatial)
 * extension. Two states:
 *  - User has a linked breakroom_identity row → "Open in Breakroom" launches
 *  - Otherwise → "Connect Breakroom" opens an explainer dialog
 */
export function OpenInBreakroomButton({ metadata }: OpenInBreakroomButtonProps) {
  const { user, session } = useAuth();
  const [showConnect, setShowConnect] = useState(false);

  const { data: identity } = useQuery({
    queryKey: ['breakroom-identity', user?.id, session?.access_token],
    enabled: !!user?.id && !!session?.access_token && hasSpatialTask(metadata),
    queryFn: async () => {
      const { data } = await supabase
        .from('breakroom_identity')
        .select('breakroom_username')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (!hasSpatialTask(metadata)) return null;

  const url = resolveLaunchUrl(metadata);
  const isLinked = !!identity?.breakroom_username;

  return (
    <>
      <Button
        size="lg"
        variant="outline"
        className="border-secondary/40 hover:bg-secondary/10"
        onClick={() => (isLinked ? window.open(url, '_blank', 'noopener,noreferrer') : setShowConnect(true))}
      >
        <Boxes className="h-5 w-5 mr-2" />
        {isLinked ? 'Open in Breakroom' : 'Connect Breakroom'}
        {isLinked ? <ExternalLink className="h-3 w-3 ml-1" /> : <Link2 className="h-3 w-3 ml-1" />}
      </Button>

      <Dialog open={showConnect} onOpenChange={setShowConnect}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-secondary" />
              Connect your Breakroom account
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-left">
              <p>
                This challenge has a spatial extension hosted in Breakroom — a metaverse
                experience where the simulator task is enriched with hands-on objectives that
                can't be expressed inside the commercial sim.
              </p>
              <p>
                To get credit on your Skill Passport when you complete it, your Breakroom
                username needs to be linked to your FGN account. An admin can link it for you
                today.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>
                  Visit{' '}
                  <a
                    href={DEFAULT_BREAKROOM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    curator.sine.space
                  </a>{' '}
                  and create or sign in to your Breakroom account.
                </li>
                <li>Note your Breakroom username.</li>
                <li>
                  Send it to your FGN admin (or post it in your community channel) so they
                  can link it. Once linked, your spatial completions sync automatically.
                </li>
              </ol>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowConnect(false)}>
              Close
            </Button>
            <Button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              Open Breakroom
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
