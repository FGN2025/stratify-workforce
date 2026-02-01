import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Loader2 } from 'lucide-react';

interface RegistrationCode {
  id: string;
  code: string;
  tenant_id: string | null;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
}

interface Tenant {
  id: string;
  name: string;
}

interface RegistrationCodeEditDialogProps {
  code: RegistrationCode | null;
  tenants: Tenant[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RegistrationCodeEditDialog({
  code,
  tenants,
  open,
  onOpenChange,
  onSaved,
}: RegistrationCodeEditDialogProps) {
  const { logAction } = useAuditLog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    if (code) {
      setDescription(code.description || '');
      setSelectedTenant(code.tenant_id || 'none');
      setMaxUses(code.max_uses?.toString() || '');
      setExpiresAt(code.expires_at ? formatDateTimeLocal(code.expires_at) : '');
    }
  }, [code]);

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!code) return;

    setIsSubmitting(true);
    try {
      const updatedFields = {
        description: description.trim() || null,
        tenant_id: selectedTenant && selectedTenant !== 'none' ? selectedTenant : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt || null,
      };

      const { error } = await supabase
        .from('registration_codes')
        .update(updatedFields)
        .eq('id', code.id);

      if (error) throw error;

      // Log audit action with changes
      await logAction({
        resourceType: 'registration_code',
        action: 'updated',
        resourceId: code.id,
        details: {
          code: code.code,
          changes: {
            description: { from: code.description, to: updatedFields.description },
            tenant_id: { from: code.tenant_id, to: updatedFields.tenant_id },
            max_uses: { from: code.max_uses, to: updatedFields.max_uses },
            expires_at: { from: code.expires_at, to: updatedFields.expires_at },
          },
        },
      });

      toast({
        title: 'Code Updated',
        description: `Registration code ${code.code} updated successfully.`,
      });

      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error('Error updating code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update registration code.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Registration Code</DialogTitle>
          <DialogDescription>
            Update settings for code <code className="font-mono bg-muted px-1 rounded">{code?.code}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Internal notes about this code..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tenant">Associate with Tenant (optional)</Label>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tenant (global code)</SelectItem>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-maxUses">Max Uses (optional)</Label>
              <Input
                id="edit-maxUses"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
              {code && code.current_uses > 0 && (
                <p className="text-xs text-muted-foreground">
                  Currently used {code.current_uses} times
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expiresAt">Expires At (optional)</Label>
              <Input
                id="edit-expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
