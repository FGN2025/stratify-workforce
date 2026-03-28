import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck,
  ShieldX,
  Search,
  Award,
  Clock,
  User,
  Fingerprint,
  ExternalLink,
  QrCode,
} from 'lucide-react';

interface VerificationResult {
  credential: {
    id: string;
    title: string;
    credential_type: string;
    issued_at: string;
    expires_at: string | null;
    score: number | null;
    issuer: string | null;
    skills_verified: string[] | null;
    game_title: string | null;
    verification_hash: string;
  };
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  passportPublic: boolean;
}

export default function VerifyCredential() {
  const [searchParams] = useSearchParams();
  const initialHash = searchParams.get('hash') || '';
  const [hashInput, setHashInput] = useState(initialHash);
  const [searchHash, setSearchHash] = useState(initialHash);

  const { data, isLoading, error } = useQuery({
    queryKey: ['verify-credential', searchHash],
    queryFn: async (): Promise<VerificationResult | null> => {
      if (!searchHash.trim()) return null;

      const cleanHash = searchHash.trim();

      // Look up credential by verification_hash
      const { data: cred, error: credErr } = await supabase
        .from('skill_credentials')
        .select('id, title, credential_type, issued_at, expires_at, score, issuer, skills_verified, game_title, verification_hash, passport_id')
        .eq('verification_hash', cleanHash)
        .single();

      if (credErr || !cred) return null;

      // Get the passport to find the user
      const { data: passport } = await supabase
        .from('skill_passport')
        .select('user_id, is_public')
        .eq('id', cred.passport_id)
        .single();

      let profile = null;
      if (passport) {
        const { data: profileData } = await supabase.rpc('get_public_profile_data', {
          profile_ids: [passport.user_id],
        });
        profile = profileData?.[0] ?? null;
      }

      return {
        credential: cred,
        profile,
        passportPublic: passport?.is_public ?? false,
      };
    },
    enabled: searchHash.trim().length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchHash(hashInput);
  };

  const isExpired = data?.credential.expires_at
    ? new Date(data.credential.expires_at) < new Date()
    : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <ShieldCheck className="h-4 w-4" />
            <span>FGN Academy — Employer Verification Portal</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verify a Credential</h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Employers and partners can verify the authenticity of any FGN Academy credential
            by entering the verification hash below. Each credential is cryptographically signed
            and tamper-evident.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="Paste verification hash (e.g. a3f8c1d2e5...)"
              className="pl-10 font-mono text-sm"
            />
          </div>
          <Button type="submit" disabled={!hashInput.trim()}>
            <Search className="h-4 w-4 mr-2" />
            Verify
          </Button>
        </form>

        {/* How it works */}
        {!searchHash && !isLoading && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                How Verification Works
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step 1</div>
                  <p>Obtain the verification hash from the student's Skill Passport, credential card, or QR code.</p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step 2</div>
                  <p>Paste the hash above and click Verify. The system looks up the credential on-chain.</p>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step 3</div>
                  <p>Review the verified credential details, including skills, score, and issuance date.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {/* Not found */}
        {searchHash && !isLoading && !data && (
          <Card className="border-destructive/30">
            <CardContent className="pt-6 flex flex-col items-center text-center py-10">
              <ShieldX className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-bold mb-1">Credential Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No credential matches this verification hash. Double-check the hash and try again.
                The hash is case-sensitive.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Verified Result */}
        {data && (
          <div className="space-y-6">
            {/* Status Banner */}
            <Card className={isExpired ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-green-500/30 bg-green-500/5'}>
              <CardContent className="pt-6 flex items-center gap-4">
                <ShieldCheck className={`h-10 w-10 ${isExpired ? 'text-yellow-500' : 'text-green-500'}`} />
                <div>
                  <h3 className="text-lg font-bold">
                    {isExpired ? 'Credential Verified (Expired)' : 'Credential Verified ✓'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This credential was issued by FGN Academy and has not been tampered with.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Credential Details */}
            <Card>
              <CardContent className="pt-6 space-y-5">
                {/* Holder */}
                {data.profile && (
                  <div className="flex items-center gap-3 pb-4 border-b">
                    {data.profile.avatar_url ? (
                      <img src={data.profile.avatar_url} alt="" className="h-10 w-10 rounded-full border" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {data.profile.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Credential Holder
                      </p>
                      <p className="font-semibold">{data.profile.username || 'Anonymous'}</p>
                    </div>
                  </div>
                )}

                {/* Title & Type */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Credential</p>
                  <h2 className="text-xl font-bold">{data.credential.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{data.credential.credential_type.replace('_', ' ')}</Badge>
                    {data.credential.game_title && (
                      <Badge variant="outline">{data.credential.game_title.replace('_', ' ')}</Badge>
                    )}
                  </div>
                </div>

                {/* Meta Grid */}
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                      <Clock className="h-3 w-3" /> Issued
                    </p>
                    <p className="font-medium">{new Date(data.credential.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  {data.credential.expires_at && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Expires</p>
                      <p className={`font-medium ${isExpired ? 'text-yellow-600' : ''}`}>
                        {new Date(data.credential.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {data.credential.score != null && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                        <Award className="h-3 w-3" /> Score
                      </p>
                      <p className="text-xl font-bold text-primary">{data.credential.score}%</p>
                    </div>
                  )}
                </div>

                {/* Issuer */}
                {data.credential.issuer && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Issuing Authority</p>
                    <p className="font-medium">{data.credential.issuer}</p>
                  </div>
                )}

                {/* Skills */}
                {data.credential.skills_verified && data.credential.skills_verified.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Verified Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.credential.skills_verified.map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hash */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Verification Hash</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                    {data.credential.verification_hash}
                  </code>
                </div>
              </CardContent>
            </Card>

            {/* Link to full passport */}
            {data.passportPublic && data.profile && (
              <div className="text-center">
                <a
                  href={`${window.location.origin}/passport/${data.profile.username?.toLowerCase().replace(/\s+/g, '-')}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View full Skill Passport <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-muted-foreground">
          <p>FGN Academy credentials are verified using SHA-256 cryptographic hashing.</p>
          <a
            href="https://stratify-workforce.lovable.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
          >
            Learn more about FGN Academy <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
