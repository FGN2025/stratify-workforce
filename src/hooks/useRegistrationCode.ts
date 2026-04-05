import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logAuditAction } from '@/hooks/useAuditLog';

export interface RegistrationCode {
  id: string;
  code: string;
  tenant_id: string | null;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  tenant_name?: string;
}

export interface ValidatedCode {
  id: string;
  code: string;
  tenantId: string | null;
  tenantName: string | null;
  isValid: boolean;
}

export function useRegistrationCode() {
  const [isValidating, setIsValidating] = useState(false);
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCode = useCallback(async (code: string): Promise<ValidatedCode | null> => {
    if (!code.trim()) {
      setValidatedCode(null);
      setError(null);
      return null;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Use secure RPC that works for both authenticated and unauthenticated users
      const { data, error: queryError } = await supabase
        .rpc('validate_registration_code', { p_code: code.trim() })
        .single();

      if (queryError || !data) {
        setError('Invalid code');
        setValidatedCode(null);
        return null;
      }

      if (!data.is_valid) {
        setError('This code is no longer valid');
        setValidatedCode(null);
        return null;
      }

      const result: ValidatedCode = {
        id: data.id,
        code: data.code,
        tenantId: data.tenant_id,
        tenantName: data.tenant_name ?? null,
        isValid: true,
      };

      setValidatedCode(result);
      setError(null);
      return result;
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Failed to validate code');
      setValidatedCode(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const redeemCode = useCallback(async (code: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('redeem_registration_code', {
        p_code: code.trim(),
      });

      if (error) {
        console.error('Error redeeming code:', error);
        return null;
      }

      // Log the redemption
      if (data) {
        await logAuditAction({
          resourceType: 'registration_code',
          action: 'redeemed',
          resourceId: data as string,
          details: { code: code.trim().toUpperCase() },
        });
      }

      return data as string | null;
    } catch (err) {
      console.error('Error redeeming code:', err);
      return null;
    }
  }, []);

  const clearValidation = useCallback(() => {
    setValidatedCode(null);
    setError(null);
  }, []);

  return {
    validateCode,
    redeemCode,
    clearValidation,
    isValidating,
    validatedCode,
    error,
  };
}
