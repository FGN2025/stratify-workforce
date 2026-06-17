import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { INDUSTRY_OPTIONS } from '@/constants/industries';
import type { CommunitySetupData } from '@/hooks/useCommunitySetup';

interface Props {
  data: Partial<CommunitySetupData>;
  onChange: (patch: Partial<CommunitySetupData>) => void;
}

export function IndustriesStep({ data, onChange }: Props) {
  const selected = data.industries || [];

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange({ industries: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick the industries your community operates in. This drives recommended content and where you appear in directories.
      </p>
      <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-border/50 bg-muted/30">
        {INDUSTRY_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`ind-${opt.value}`}
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            <Label htmlFor={`ind-${opt.value}`} className="text-sm cursor-pointer font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-amber-500">Select at least one industry to continue.</p>
      )}
    </div>
  );
}
