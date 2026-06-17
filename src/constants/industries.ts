export const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'broadband', label: 'Broadband / Telecom' },
  { value: 'construction', label: 'Construction' },
  { value: 'oil_gas', label: 'Oil & Gas' },
  { value: 'trucking', label: 'Trucking & Logistics' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'energy', label: 'Energy' },
  { value: 'public_sector', label: 'Public Sector' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'other', label: 'Other' },
];

export const INDUSTRY_LABEL: Record<string, string> = Object.fromEntries(
  INDUSTRY_OPTIONS.map((i) => [i.value, i.label])
);
