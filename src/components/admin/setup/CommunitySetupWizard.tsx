import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { useCommunitySetup, type CommunitySetupData } from '@/hooks/useCommunitySetup';
import { IdentityStep } from './steps/IdentityStep';
import { CorporateStep } from './steps/CorporateStep';
import { IndustriesStep } from './steps/IndustriesStep';
import { CatalogStep } from './steps/CatalogStep';
import { ReviewStep } from './steps/ReviewStep';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = ['Identity', 'Corporate', 'Industries', 'Catalog', 'Review'] as const;

export function CommunitySetupWizard({ open, onOpenChange }: Props) {
  const { tenant } = useTenant();
  const { data, isLoading, save, isSaving } = useCommunitySetup(tenant?.id);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<CommunitySetupData>>({});

  useEffect(() => {
    if (data && open) {
      setDraft(data);
      setStep(Math.min(data.setup_step ?? 0, STEPS.length - 1));
    }
  }, [data, open]);

  const update = (patch: Partial<CommunitySetupData>) => setDraft((d) => ({ ...d, ...patch }));

  const canAdvance = () => {
    if (step === 0) return !!draft.name && !!draft.slug;
    if (step === 2) return (draft.industries || []).length > 0;
    return true;
  };

  const handleNext = async () => {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    await save({ ...draft, setup_step: nextStep });
    setStep(nextStep);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSaveDraft = async () => {
    await save({ ...draft, setup_step: step });
    toast({ title: 'Draft saved' });
  };

  const handleFinish = async () => {
    await save({ ...draft, setup_step: STEPS.length - 1, setup_completed_at: new Date().toISOString() });
    toast({ title: 'Setup complete', description: 'Your community is ready.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Community Setup</DialogTitle>
          <DialogDescription>
            Configure your community's identity, corporate details, industries, and which content from FGN's catalog members can see.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between gap-2 py-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap',
                  i === step ? 'bg-primary text-primary-foreground' : i < step ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : <span className="h-5 w-5 rounded-full bg-muted text-foreground/70 inline-flex items-center justify-center">{i + 1}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="min-h-[300px] py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <>
              {step === 0 && <IdentityStep data={draft} onChange={update} />}
              {step === 1 && <CorporateStep data={draft} onChange={update} />}
              {step === 2 && <IndustriesStep data={draft} onChange={update} />}
              {step === 3 && <CatalogStep />}
              {step === 4 && <ReviewStep data={draft} />}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={handleSaveDraft} disabled={isSaving}>
            Save draft
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={step === 0 || isSaving}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canAdvance() || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Next
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Finish setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
