import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScormBuildRequest {
  workOrderId: string;
  destination: 'fgn-academy' | 'broadband-workforce' | 'simu-cdl-path' | 'external-lms';
  brandMode: 'arcade' | 'enterprise';
  scormVersion?: '1.2' | 'cmi5';
  title?: string;
  description?: string;
  enhanceText?: boolean;
  enhanceCover?: boolean;
}

export interface ScormBuildWarning {
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
  suggestion?: string;
}

export interface ScormBuildResult {
  status: string;
  courseId: string;
  manifestUrl: string;
  zipUrl: string | null;
  playerUrl: string | null;
  workOrderUrl: string;
  coverImageUrl: string | null;
  title: string;
  isReplacement: boolean;
  warnings: ScormBuildWarning[];
}

export function useScormBuild() {
  const [isBuilding, setIsBuilding] = useState(false);
  const [result, setResult] = useState<ScormBuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const build = async (req: ScormBuildRequest): Promise<ScormBuildResult | null> => {
    setIsBuilding(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('scorm-build', {
        body: req,
      });
      if (invokeErr) throw invokeErr;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as ScormBuildResult);
      return data as ScormBuildResult;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setIsBuilding(false);
    }
  };

  return { build, isBuilding, result, error, reset: () => { setResult(null); setError(null); } };
}
