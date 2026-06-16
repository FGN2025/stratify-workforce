// src/lib/work-order-display.ts
// Single source of truth for resolving a work order's display name.
// See docs/work-order-name-contract.md §7.
//
// Priority: title → generated_name → metadata.play_source.name → fallback.
// All three legs are trimmed and null-guarded so whitespace-only values
// fall through instead of rendering blank.

export type WorkOrderDisplayInput = {
  title?: string | null;
  generated_name?: string | null;
  metadata?: { play_source?: { name?: string | null } | null } | null;
};

const FALLBACK = "Untitled work order";

export function getWorkOrderDisplayName(wo: WorkOrderDisplayInput | null | undefined): string {
  if (!wo) return FALLBACK;
  const title = wo.title?.trim() || null;
  if (title) return title;
  const generated = wo.generated_name?.trim() || null;
  if (generated) return generated;
  const playSourceName = wo.metadata?.play_source?.name?.trim() || null;
  if (playSourceName) return playSourceName;
  return FALLBACK;
}
