import { CurationManager } from '@/components/admin/CurationManager';

export function CatalogStep() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose which challenges, work orders, events, and courses from the FGN super-catalog
        your members will see. Anything not included is hidden from your community.
      </p>
      <CurationManager />
    </div>
  );
}
