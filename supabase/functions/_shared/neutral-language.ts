// supabase/functions/_shared/neutral-language.ts
// Source of truth for the neutral-language rule shared by cover-image
// and work-order-name synthesis. See docs/cover-prompt-contract.md §3
// and docs/work-order-name-contract.md §3.

export const BANNED_TERMS: readonly string[] = [
  "load out",
  "loadout",
  "loadouts",
  "plan the route",
  "route plan",
  "plan your route",
  "sim",
  "simulator",
  "simulation",
  "in-game",
  "in game",
  "gameplay",
  "challenge",
  "work order",
  "job task",
  "objective",
  "mission",
  "tutorial",
  "training scenario",
  "playthrough",
  "spatial task",
  "sequence task",
  "loadout task",
  "debrief",
  "deploy",
  "spawn",
];

/**
 * Returns the lowercased banned terms detected in the input text, or [] if clean.
 * Word-boundary-ish match, case-insensitive — "sim" must not match "simple".
 */
export function findBannedTerms(text: string): string[] {
  if (!text) return [];
  const hits: string[] = [];
  for (const term of BANNED_TERMS) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i");
    if (re.test(text)) hits.push(term);
  }
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * System-prompt fragment that documents the neutral-language rule for the
 * model. Both synthesizers paste this into their system prompts so they share
 * one source of truth.
 */
export const NEUTRAL_LANGUAGE_RULES = `NEUTRAL-LANGUAGE RULE (non-negotiable):

Describe the real-world work and scene. NEVER echo platform-internal jargon, sim/game vocabulary, or archetype labels, even if those words appear in the input. Banned terms include but are not limited to: "load out", "loadout", "plan the route", "sim", "simulator", "in-game", "gameplay", "challenge", "work order", "mission", "objective", "tutorial", "spatial task", "sequence task", "loadout task", "debrief", "deploy", "spawn".

Translate work-order vocabulary into real-world vocabulary:
- "loadout" → describe the actual tools/equipment
- "plan the route" → describe the actual movement or location
- "challenge / work order" → describe the work being done
- Sim/game names → the underlying trade (e.g. "residential renovation", "long-haul trucking", "commercial aviation", "row-crop farming")`;
