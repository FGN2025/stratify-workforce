import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AddressValidationForm } from './AddressValidationForm';
import { OverrideCodeInput } from './OverrideCodeInput';
import { useOnboardingStatus, SaveAddressInput } from '@/hooks/useOnboardingStatus';
import { useRegistrationCode, ValidatedCode } from '@/hooks/useRegistrationCode';
import { AddressInput, ValidatedAddress } from '@/hooks/useAddressValidation';
import { toast } from '@/hooks/use-toast';
import { User, MapPin, Check, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcademyOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = 'personal' | 'address' | 'success';

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
  { key: 'address', label: 'Address', icon: <MapPin className="h-4 w-4" /> },
  { key: 'success', label: 'Complete', icon: <Check className="h-4 w-4" /> },
];

export function AcademyOnboardingDialog({ open, onOpenChange, onComplete }: AcademyOnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [fullName, setFullName] = useState('');
  const [discordId, setDiscordId] = useState('');
  const [overrideCode, setOverrideCode] = useState('');
  const [validatedOverrideCode, setValidatedOverrideCode] = useState<ValidatedCode | null>(null);
  const [nameError, setNameError] = useState('');
  
  const { saveAddress, isSaving } = useOnboardingStatus();
  const { redeemCode } = useRegistrationCode();
  
  const handleValidCode = useCallback((code: ValidatedCode | null) => {
    setValidatedOverrideCode(code);
  }, []);

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handlePersonalSubmit = () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setNameError('Please enter your full name (at least 2 characters)');
      return;
    }
    setNameError('');
    setCurrentStep('address');
  };

  const handleAddressValidated = async (
    address: ValidatedAddress | AddressInput,
    isValidated: boolean,
    smartyResponse?: unknown
  ) => {
    try {
      // Both ValidatedAddress and AddressInput have zipCode
      const zipCode = address.zipCode;
      
      // If we have a valid override code, redeem it and mark as validated
      let overrideCodeId: string | undefined;
      let tenantId: string | undefined;
      
      if (validatedOverrideCode) {
        const redeemedId = await redeemCode(overrideCode);
        if (redeemedId) {
          overrideCodeId = redeemedId;
          tenantId = validatedOverrideCode.tenantId ?? undefined;
          isValidated = true; // Override marks as validated
        }
      }
      
      const saveData: SaveAddressInput = {
        fullName: fullName.trim(),
        streetAddress: address.street,
        city: address.city,
        state: address.state,
        zipCode,
        discordId: discordId.trim() || undefined,
        isValidated,
        smartyResponse,
        overrideCodeId,
        tenantId,
      };

      await saveAddress(saveData);
      setCurrentStep('success');

      toast({
        title: 'Registration Complete!',
        description: 'Welcome to FGN Academy. Now select your simulation tracks.',
      });
    } catch (error) {
      console.error('Failed to save address:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = () => {
    onComplete();
    // Reset state for next time
    setCurrentStep('personal');
    setFullName('');
    setDiscordId('');
    setOverrideCode('');
    setValidatedOverrideCode(null);
  };

  const handleClose = () => {
    if (currentStep === 'success') {
      handleComplete();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {currentStep === 'success' ? 'Welcome to FGN Academy!' : 'Join FGN Academy'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'personal' && 'Tell us a bit about yourself to get started.'}
            {currentStep === 'address' && 'We need your address for membership verification.'}
            {currentStep === 'success' && 'Your registration is complete!'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center border',
                    index < currentStepIndex
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index === currentStepIndex
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-4">
          {currentStep === 'personal' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setNameError('');
                  }}
                  className={cn(nameError && 'border-destructive')}
                />
                {nameError && (
                  <p className="text-xs text-destructive">{nameError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discordId" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Discord ID
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="discordId"
                  placeholder="username#1234"
                  value={discordId}
                  onChange={(e) => setDiscordId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Coming soon: Discord integration for community features
                </p>
              </div>

              <OverrideCodeInput
                value={overrideCode}
                onChange={setOverrideCode}
                onValidCode={handleValidCode}
              />

              <Button onClick={handlePersonalSubmit} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {currentStep === 'address' && (
            <AddressValidationForm
              onAddressValidated={handleAddressValidated}
              onBack={() => setCurrentStep('personal')}
              isSubmitting={isSaving}
              overrideCode={validatedOverrideCode}
            />
          )}

          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Welcome, {fullName}!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Now choose which simulation tracks you want to join.
                </p>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Select Simulations
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
