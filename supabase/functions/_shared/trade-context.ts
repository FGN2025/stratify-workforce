// supabase/functions/_shared/trade-context.ts
// Source of truth for sim → real-world trade mappings.
// Consumed by synthesize-cover-prompt and synthesize-work-order-name.
// See docs/cover-prompt-contract.md §5 and docs/work-order-name-contract.md §5.

export const TRADE_CONTEXT: Record<string, string> = {
  American_Truck_Simulator: "long-haul trucking on American highways",
  Euro_Truck_Simulator_2: "long-haul trucking through European cities",
  Farming_Simulator_25: "row-crop and livestock farming",
  Farming_Simulator_22: "row-crop and livestock farming",
  Construction_Simulator: "heavy commercial construction",
  Car_Mechanic_Simulator_2021: "automotive repair in a professional garage",
  Roadcraft: "heavy civil roadworks and infrastructure",
  Fiber_Tech: "outside-plant fiber-optic network construction",
  House_Flipper: "residential renovation and restoration",
  House_Flipper_2: "residential renovation and restoration",
  Microsoft_Flight_Simulator_2024: "commercial and general aviation operations",
  MSFS_2024: "commercial and general aviation operations",
};

export const TRADE_CONTEXT_FALLBACK = "industrial trade work";

export function getTradeContext(gameTitle: string | null | undefined): string {
  if (!gameTitle) return TRADE_CONTEXT_FALLBACK;
  return TRADE_CONTEXT[gameTitle] ?? TRADE_CONTEXT_FALLBACK;
}
