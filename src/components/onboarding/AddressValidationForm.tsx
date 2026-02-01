import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAddressValidation, AddressInput, ValidatedAddress } from '@/hooks/useAddressValidation';
import { ValidatedCode } from '@/hooks/useRegistrationCode';
import { Check, AlertTriangle, Loader2, MapPin, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressValidationFormProps {
  onAddressValidated: (address: ValidatedAddress | AddressInput, isValidated: boolean, smartyResponse?: Record<string, unknown>) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  overrideCode?: ValidatedCode | null;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export function AddressValidationForm({ onAddressValidated, onBack, isSubmitting, overrideCode }: AddressValidationFormProps) {
  const [formData, setFormData] = useState<AddressInput>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [showValidation, setShowValidation] = useState(false);
  
  const { validateAddress, isValidating, validationResult, resetValidation } = useAddressValidation();
  
  const hasOverrideCode = !!overrideCode;

  const handleChange = (field: keyof AddressInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
    if (showValidation) {
      setShowValidation(false);
      resetValidation();
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AddressInput, string>> = {};

    if (!formData.street.trim() || formData.street.trim().length < 5) {
      errors.street = 'Please enter a valid street address';
    }
    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = 'Please enter a valid city';
    }
    if (!formData.state.trim() || formData.state.trim().length !== 2) {
      errors.state = 'Please use 2-letter state code';
    } else if (!US_STATES.includes(formData.state.toUpperCase())) {
      errors.state = 'Please enter a valid US state';
    }
    if (!formData.zipCode.trim() || !/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
      errors.zipCode = 'Please enter a valid ZIP code';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleValidate = async () => {
    if (!validateForm()) return;
    
    // If override code is present, skip Smarty validation
    if (hasOverrideCode) {
      onAddressValidated(formData, true);
      return;
    }
    
    await validateAddress(formData);
    setShowValidation(true);
  };
  
  const handleSkipValidation = () => {
    if (!validateForm()) return;
    onAddressValidated(formData, true);
  };

  const handleAcceptValidated = () => {
    if (validationResult?.validatedAddress) {
      onAddressValidated(
        validationResult.validatedAddress,
        true,
        validationResult.smartyResponse as unknown as Record<string, unknown> | undefined
      );
    }
  };

  const handleUseOriginal = () => {
    onAddressValidated(formData, false);
  };

  return (
    <div className="space-y-6">
      {/* Override Code Banner */}
      {hasOverrideCode && (
        <Alert className="border-primary/50 bg-primary/10">
          <Key className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <span className="font-medium">Code override active</span>
            {overrideCode.tenantName && (
              <span className="text-muted-foreground"> — {overrideCode.tenantName}</span>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Address verification will be bypassed.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="street">Street Address</Label>
          <Input
            id="street"
            placeholder="123 Main Street"
            value={formData.street}
            onChange={(e) => handleChange('street', e.target.value)}
            className={cn(formErrors.street && 'border-destructive')}
          />
          {formErrors.street && (
            <p className="text-xs text-destructive">{formErrors.street}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="City"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className={cn(formErrors.city && 'border-destructive')}
            />
            {formErrors.city && (
              <p className="text-xs text-destructive">{formErrors.city}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              placeholder="CA"
              maxLength={2}
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
              className={cn(formErrors.state && 'border-destructive')}
            />
            {formErrors.state && (
              <p className="text-xs text-destructive">{formErrors.state}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code</Label>
          <Input
            id="zipCode"
            placeholder="12345"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            className={cn(formErrors.zipCode && 'border-destructive')}
          />
          {formErrors.zipCode && (
            <p className="text-xs text-destructive">{formErrors.zipCode}</p>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {showValidation && validationResult && (
        <div className="space-y-4">
          {validationResult.isValid && validationResult.validatedAddress ? (
            <>
              {validationResult.hasCorrections ? (
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">We found a corrected address:</span>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-primary/50 bg-primary/10">
                  <Check className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">Address verified successfully!</span>
                  </AlertDescription>
                </Alert>
              )}

              <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  Verified Address
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{validationResult.validatedAddress.street}</p>
                  <p>
                    {validationResult.validatedAddress.city}, {validationResult.validatedAddress.state}{' '}
                    {validationResult.validatedAddress.zipCode}
                    {validationResult.validatedAddress.plus4Code && `-${validationResult.validatedAddress.plus4Code}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAcceptValidated}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Use Verified Address
                </Button>
                {validationResult.hasCorrections && (
                  <Button
                    variant="outline"
                    onClick={handleUseOriginal}
                    disabled={isSubmitting}
                  >
                    Use Original
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {validationResult.errorMessage || 'Address could not be verified.'}
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowValidation(false);
                    resetValidation();
                  }}
                  className="flex-1"
                >
                  Edit Address
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleUseOriginal}
                  disabled={isSubmitting}
                >
                  Continue Anyway
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Buttons (before validation) */}
      {!showValidation && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={handleValidate}
            disabled={isValidating || isSubmitting}
            className="flex-1"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : hasOverrideCode ? (
              'Complete Registration'
            ) : (
              'Verify Address'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
