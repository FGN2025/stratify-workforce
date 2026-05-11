import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type ConsumeResult = {
  user_id: string;
  intent: string;
  passport_slug: string | null;
  is_public: boolean;
};

export default function PassportLink() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Missing token.');
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error: fnErr } = await supabase.functions.invoke<ConsumeResult>(
        'credential-api/passport-link/consume',
        { body: { token } }
      );
      if (cancelled) return;
      if (fnErr || !data) {
        setError('This link has expired or is invalid. Ask Play to generate a new one.');
        return;
      }

      // Owner view: viewer is signed in as the resolved user
      if (user?.id === data.user_id) {
        navigate('/profile', { replace: true });
        return;
      }
      // Public passport fallback
      if (data.passport_slug && data.is_public) {
        navigate(`/passport/${data.passport_slug}`, { replace: true });
        return;
      }
      // Need sign-in to view private owner passport
      navigate(`/auth?next=${encodeURIComponent('/profile')}`, { replace: true });
    })();

    return () => { cancelled = true; };
  }, [params, navigate, user?.id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3 text-center px-4">
        {error ? (
          <>
            <p className="text-destructive font-medium">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-primary hover:underline"
            >
              Return home
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Opening your Skill Passport…</p>
          </>
        )}
      </div>
    </div>
  );
}
