import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      // Query the code with tenant info
      const { data, error: queryError } = await supabase
        .from('registration_codes')
        .select(`
          id,
          code,
          tenant_id,
          max_uses,
          current_uses,
          is_active,
          expires_at,
          tenants (
            name
          )
        `)
        .ilike('code', code.trim())
        .single();

      if (queryError || !data) {
        setError('Invalid code');
        setValidatedCode(null);
        return null;
      }

      // Check if code is valid
      const now = new Date();
      const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
      const isExpired = expiresAt && expiresAt < now;
      const isExhausted = data.max_uses !== null && data.current_uses >= data.max_uses;
      const isActive = data.is_active;

      if (!isActive) {
        setError('This code is no longer active');
        setValidatedCode(null);
        return null;
      }

      if (isExpired) {
        setError('This code has expired');
        setValidatedCode(null);
        return null;
      }

      if (isExhausted) {
        setError('This code has reached its usage limit');
        setValidatedCode(null);
        return null;
      }

      const tenantData = data.tenants as { name: string } | null;
      const result: ValidatedCode = {
        id: data.id,
        code: data.code,
        tenantId: data.tenant_id,
        tenantName: tenantData?.name ?? null,
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
