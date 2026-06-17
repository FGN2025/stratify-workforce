import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CommunitySetupData } from '@/hooks/useCommunitySetup';

interface Props {
  data: Partial<CommunitySetupData>;
  onChange: (patch: Partial<CommunitySetupData>) => void;
}

export function CorporateStep({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Legal Name</Label>
          <Input value={data.legal_name || ''} onChange={(e) => onChange({ legal_name: e.target.value })} placeholder="Cox Communications, Inc." />
        </div>
        <div className="space-y-2">
          <Label>Doing Business As (DBA)</Label>
          <Input value={data.dba || ''} onChange={(e) => onChange({ dba: e.target.value })} placeholder="COX" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Public Website</Label>
        <Input value={data.website_url || ''} onChange={(e) => onChange({ website_url: e.target.value })} placeholder="https://www.cox.com" />
      </div>

      <div className="pt-2">
        <h4 className="text-sm font-semibold mb-3">Primary Contact</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input value={data.primary_contact_name || ''} onChange={(e) => onChange({ primary_contact_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input type="email" value={data.primary_contact_email || ''} onChange={(e) => onChange({ primary_contact_email: e.target.value })} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Contact Phone</Label>
            <Input value={data.primary_contact_phone || ''} onChange={(e) => onChange({ primary_contact_phone: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <h4 className="text-sm font-semibold mb-3">Headquarters</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Street</Label>
            <Input value={data.hq_street || ''} onChange={(e) => onChange({ hq_street: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={data.hq_city || ''} onChange={(e) => onChange({ hq_city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State / Region</Label>
              <Input value={data.hq_state || ''} onChange={(e) => onChange({ hq_state: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input value={data.hq_zip || ''} onChange={(e) => onChange({ hq_zip: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input value={data.hq_country || ''} onChange={(e) => onChange({ hq_country: e.target.value })} placeholder="United States" />
          </div>
        </div>
      </div>
    </div>
  );
}
