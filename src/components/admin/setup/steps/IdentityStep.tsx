import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CommunitySetupData } from '@/hooks/useCommunitySetup';

interface Props {
  data: Partial<CommunitySetupData>;
  onChange: (patch: Partial<CommunitySetupData>) => void;
}

export function IdentityStep({ data, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Community Name *</Label>
          <Input value={data.name || ''} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>URL Slug *</Label>
          <Input
            value={data.slug || ''}
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Short Description</Label>
        <Textarea
          rows={3}
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Tell members what your community is about."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Logo URL</Label>
          <Input value={data.logo_url || ''} onChange={(e) => onChange({ logo_url: e.target.value })} placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label>Cover Image URL</Label>
          <Input value={data.cover_image_url || ''} onChange={(e) => onChange({ cover_image_url: e.target.value })} placeholder="https://…" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Brand Color</Label>
        <div className="flex gap-2">
          <Input type="color" value={data.brand_color || '#F59E0B'} onChange={(e) => onChange({ brand_color: e.target.value })} className="w-16 h-10 p-1" />
          <Input value={data.brand_color || ''} onChange={(e) => onChange({ brand_color: e.target.value })} placeholder="#F59E0B" className="flex-1" />
        </div>
      </div>
    </div>
  );
}
