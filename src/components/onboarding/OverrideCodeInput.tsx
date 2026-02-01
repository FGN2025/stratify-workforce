import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useRegistrationCode, ValidatedCode } from '@/hooks/useRegistrationCode';
import { Check, X, Loader2, ChevronDown, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface OverrideCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidCode: (code: ValidatedCode | null) => void;
}

export function OverrideCodeInput({ value, onChange, onValidCode }: OverrideCodeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { validateCode, isValidating, validatedCode, error, clearValidation } = useRegistrationCode();
  const debouncedCode = useDebounce(value, 500);

  useEffect(() => {
    if (debouncedCode.trim()) {
      validateCode(debouncedCode);
    } else {
      clearValidation();
    }
  }, [debouncedCode, validateCode, clearValidation]);

  useEffect(() => {
    onValidCode(validatedCode);
  }, [validatedCode, onValidCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
        <Key className="h-4 w-4" />
        <span>Have an override code?</span>
        <ChevronDown className={cn(
          "h-4 w-4 ml-auto transition-transform",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-2 pt-2">
        <div className="space-y-2">
          <Label htmlFor="overrideCode">Override Code</Label>
          <div className="relative">
            <Input
              id="overrideCode"
              placeholder="ACADEMY2025"
              value={value}
              onChange={handleChange}
              className={cn(
                "pr-10 font-mono",
                validatedCode && "border-primary focus-visible:ring-primary",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidating && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!isValidating && validatedCode && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {!isValidating && error && value && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          
          {validatedCode && (
            <p className="text-xs text-primary flex items-center gap-1">
              <Check className="h-3 w-3" />
              Code valid
              {validatedCode.tenantName && (
                <span>— {validatedCode.tenantName}</span>
              )}
            </p>
          )}
          
          {error && value && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          
          <p className="text-xs text-muted-foreground">
            Enter a code provided by your organization to skip address verification
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
