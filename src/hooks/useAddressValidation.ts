import { useState, useCallback } from 'react';

const SMARTY_EMBEDDED_KEY = '260377163906526147';
const SMARTY_API_URL = 'https://us-street.api.smarty.com/street-address';

export interface AddressInput {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ValidatedAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  plus4Code?: string;
  deliveryPoint?: string;
}

export interface SmartyResponse {
  input_index: number;
  candidate_index: number;
  delivery_line_1: string;
  last_line: string;
  delivery_point_barcode: string;
  components: {
    primary_number: string;
    street_name: string;
    street_suffix: string;
    city_name: string;
    state_abbreviation: string;
    zipcode: string;
    plus4_code: string;
    delivery_point: string;
  };
  metadata: {
    record_type: string;
    zip_type: string;
    county_fips: string;
    county_name: string;
    latitude: number;
    longitude: number;
  };
  analysis: {
    dpv_match_code: string;
    dpv_footnotes: string;
    dpv_cmra: string;
    dpv_vacant: string;
    active: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  validatedAddress: ValidatedAddress | null;
  originalAddress: AddressInput;
  hasCorrections: boolean;
  smartyResponse: SmartyResponse | null;
  errorMessage?: string;
}

export function useAddressValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateAddress = useCallback(async (address: AddressInput): Promise<ValidationResult> => {
    setIsValidating(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: SMARTY_EMBEDDED_KEY,
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        zipcode: address.zipCode.trim(),
        candidates: '1',
      });

      const response = await fetch(`${SMARTY_API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: SmartyResponse[] = await response.json();

      if (data.length === 0) {
        // No match found
        const result: ValidationResult = {
          isValid: false,
          validatedAddress: null,
          originalAddress: address,
          hasCorrections: false,
          smartyResponse: null,
          errorMessage: 'Address could not be verified. Please check your entry.',
        };
        setValidationResult(result);
        return result;
      }

      const match = data[0];
      const validatedAddress: ValidatedAddress = {
        street: match.delivery_line_1,
        city: match.components.city_name,
        state: match.components.state_abbreviation,
        zipCode: match.components.zipcode,
        plus4Code: match.components.plus4_code,
        deliveryPoint: match.components.delivery_point,
      };

      // Check if there are corrections
      const hasCorrections = 
        validatedAddress.street.toLowerCase() !== address.street.trim().toLowerCase() ||
        validatedAddress.city.toLowerCase() !== address.city.trim().toLowerCase() ||
        validatedAddress.state.toLowerCase() !== address.state.trim().toLowerCase() ||
        validatedAddress.zipCode !== address.zipCode.trim();

      const result: ValidationResult = {
        isValid: true,
        validatedAddress,
        originalAddress: address,
        hasCorrections,
        smartyResponse: match,
      };

      setValidationResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate address';
      setError(errorMessage);
      
      const result: ValidationResult = {
        isValid: false,
        validatedAddress: null,
        originalAddress: address,
        hasCorrections: false,
        smartyResponse: null,
        errorMessage,
      };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    validateAddress,
    isValidating,
    validationResult,
    error,
    resetValidation,
  };
}
