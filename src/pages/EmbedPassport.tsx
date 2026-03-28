import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Award, Gauge, ExternalLink } from 'lucide-react';

export default function EmbedPassport() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const gameFilter = searchParams.get('game');
  const theme = searchParams.get('theme') || 'light';
  const compact = searchParams.get('compact') === 'true';

  const { data, isLoading, error } = useQuery({
    queryKey: ['embed-passport', slug, gameFilter],
    queryFn: async () => {
      if (!slug) throw new Error('No slug');

      const { data: passport, error: pErr } = await supabase
        .from('skill_passport')
        .select('id, user_id, is_public, passport_hash')
        .eq('public_url_slug', slug)
        .eq('is_public', true)
        .single();

      if (pErr || !passport) throw new Error('Not found');

      const { data: profileData } = await supabase
        .rpc('get_public_profile_data', { profile_ids: [passport.user_id] });
      const profile = profileData?.[0];

      let credQuery = supabase
        .from('skill_credentials')
        .select('id, title, credential_type, issued_at, score, game_title, skills_verified')
        .eq('passport_id', passport.id)
        .order('issued_at', { ascending: false });

      if (gameFilter) {
        credQuery = credQuery.eq('game_title', gameFilter as any);
      }

      const { data: credentials } = await credQuery;

      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('employability_score')
        .eq('id', passport.user_id)
        .single();

      return {
        profile,
        credentials: credentials || [],
        employabilityScore: fullProfile?.employability_score ?? 0,
        hash: passport.passport_hash,
      };
    },
    enabled: !!slug,
  });

  const isDark = theme === 'dark';
  const bg = isDark ? '#1a1a2e' : '#ffffff';
  const fg = isDark ? '#e2e8f0' : '#1a1a2e';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const accent = isDark ? '#818cf8' : '#4f46e5';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (isLoading) {
    return (
      <div style={{ background: bg, color: fg, padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ background: cardBg, borderRadius: '8px', height: '60px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div style={{ background: bg, color: muted, padding: '32px', textAlign: 'center', fontFamily: 'system-ui, sans-serif', fontSize: '14px' }}>
        Passport not found or is private.
      </div>
    );
  }

  const { profile, credentials, employabilityScore } = data;

  return (
    <div style={{
      background: bg,
      color: fg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: compact ? '12px' : '20px',
      minHeight: compact ? 'auto' : '100vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: compact ? '12px' : '20px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${border}`,
      }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${accent}` }}
          />
        ) : (
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: accent, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px',
          }}>
            {profile.username?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>{profile.username || 'Operator'}</div>
          <div style={{ fontSize: '12px', color: muted, display: 'flex', gap: '12px', marginTop: '2px' }}>
            <span>{credentials.length} credential{credentials.length !== 1 ? 's' : ''}</span>
            <span>Score: <strong style={{ color: accent }}>{employabilityScore?.toFixed(1)}</strong></span>
          </div>
        </div>
        <div style={{
          background: `${accent}15`,
          borderRadius: '8px',
          padding: '6px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: accent }}>{employabilityScore?.toFixed(0)}</div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: muted }}>Score</div>
        </div>
      </div>

      {/* Credentials */}
      {credentials.length === 0 ? (
        <div style={{ color: muted, fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          No credentials earned yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(compact ? credentials.slice(0, 5) : credentials).map((cred: any) => (
            <div
              key={cred.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: cardBg,
                borderRadius: '8px',
                border: `1px solid ${border}`,
                fontSize: '13px',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{cred.title}</div>
                <div style={{ fontSize: '11px', color: muted, marginTop: '2px', display: 'flex', gap: '8px' }}>
                  <span>{new Date(cred.issued_at).toLocaleDateString()}</span>
                  {cred.game_title && (
                    <span style={{
                      background: `${accent}20`,
                      color: accent,
                      padding: '0 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}>
                      {cred.game_title.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
              {cred.score != null && (
                <div style={{ fontWeight: 700, color: accent, fontSize: '15px' }}>{cred.score}%</div>
              )}
            </div>
          ))}
          {compact && credentials.length > 5 && (
            <div style={{ fontSize: '12px', color: muted, textAlign: 'center', padding: '4px' }}>
              +{credentials.length - 5} more credentials
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: `1px solid ${border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: muted,
      }}>
        <span>Verified by FGN Academy</span>
        <a
          href={`https://stratify-workforce.lovable.app/passport/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          View full passport ↗
        </a>
      </div>
    </div>
  );
}
