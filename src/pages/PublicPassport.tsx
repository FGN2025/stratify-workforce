import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Award, Clock, Shield, ExternalLink } from 'lucide-react';

export default function PublicPassport() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-passport', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');

      // Get passport by slug
      const { data: passport, error: passportErr } = await supabase
        .from('skill_passport')
        .select('id, user_id, is_public, passport_hash')
        .eq('public_url_slug', slug)
        .eq('is_public', true)
        .single();

      if (passportErr || !passport) throw new Error('Passport not found');

      // Get profile
      const { data: profileData } = await supabase
        .rpc('get_public_profile_data', { profile_ids: [passport.user_id] });
      const profile = profileData?.[0];

      // Get credentials
      const { data: credentials } = await supabase
        .from('skill_credentials')
        .select('id, title, credential_type, issued_at, expires_at, score, issuer, skills_verified, game_title')
        .eq('passport_id', passport.id)
        .order('issued_at', { ascending: false });

      // Get employability score
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('employability_score')
        .eq('id', passport.user_id)
        .single();

      return {
        profile,
        credentials: credentials || [],
        passportHash: passport.passport_hash,
        employabilityScore: fullProfile?.employability_score ?? 0,
      };
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Passport Not Found</h2>
            <p className="text-muted-foreground">This Skill Passport is private or doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { profile, credentials, employabilityScore } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Gauge className="h-4 w-4" />
            <span>FGN Academy — Verified Skill Passport</span>
          </div>
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full border-2 border-primary/30" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                {profile.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{profile.username || 'Operator'}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" />
                  {credentials.length} credential{credentials.length !== 1 ? 's' : ''}
                </span>
                <span>Employability Score: <strong className="text-foreground">{employabilityScore?.toFixed(1)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Verified Credentials
        </h2>

        {credentials.length === 0 ? (
          <p className="text-muted-foreground">No credentials have been earned yet.</p>
        ) : (
          <div className="grid gap-3">
            {credentials.map((cred: any) => (
              <Card key={cred.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{cred.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {cred.issuer && <span>Issued by {cred.issuer}</span>}
                      <span>•</span>
                      <span>{new Date(cred.issued_at).toLocaleDateString()}</span>
                      {cred.game_title && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] py-0">{cred.game_title.replace('_', ' ')}</Badge>
                        </>
                      )}
                    </div>
                    {cred.skills_verified && cred.skills_verified.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {cred.skills_verified.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-[10px]">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {cred.score != null && (
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{cred.score}%</div>
                      <div className="text-[10px] text-muted-foreground">Score</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Verification footer */}
        <div className="border-t pt-6 mt-8 text-center text-xs text-muted-foreground">
          <p>This Skill Passport is cryptographically verified by FGN Academy.</p>
          <p className="mt-1">Hash: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{data.passportHash?.slice(0, 16)}…</code></p>
          <a href="https://stratify-workforce.lovable.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline mt-2">
            Learn more about FGN Academy <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
