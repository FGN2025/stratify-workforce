import { Badge } from '@/components/ui/badge';
import { INDUSTRY_LABEL } from '@/constants/industries';
import type { CommunitySetupData } from '@/hooks/useCommunitySetup';

interface Props {
  data: Partial<CommunitySetupData>;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/40 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || <span className="text-muted-foreground/60">—</span>}</span>
    </div>
  );
}

export function ReviewStep({ data }: Props) {
  const hq = [data.hq_street, data.hq_city, data.hq_state, data.hq_zip, data.hq_country].filter(Boolean).join(', ');
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Confirm your setup. You can always re-open this wizard from Admin → Community Setup.
      </p>
      <div className="rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-2">Identity</h4>
        <Row label="Name" value={data.name} />
        <Row label="Slug" value={data.slug} />
        <Row label="Description" value={data.description} />
        <Row label="Brand color" value={data.brand_color} />
      </div>
      <div className="rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-2">Corporate</h4>
        <Row label="Legal name" value={data.legal_name} />
        <Row label="DBA" value={data.dba} />
        <Row label="Website" value={data.website_url} />
        <Row label="Primary contact" value={data.primary_contact_name} />
        <Row label="Contact email" value={data.primary_contact_email} />
        <Row label="HQ" value={hq} />
      </div>
      <div className="rounded-lg border border-border/50 p-4">
        <h4 className="text-sm font-semibold mb-2">Industries</h4>
        <div className="flex flex-wrap gap-2 pt-1">
          {(data.industries || []).length === 0 && <span className="text-sm text-muted-foreground">None selected</span>}
          {(data.industries || []).map((i) => (
            <Badge key={i} variant="secondary">{INDUSTRY_LABEL[i] || i}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
