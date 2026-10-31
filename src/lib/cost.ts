import type { HouseAnalysis } from "@/types";

// ---------------------------------------------------------------------------
// Rough planning estimate. Rates are placeholders for demo purposes and the
// UI labels the result as NOT a quote.
// ---------------------------------------------------------------------------

export type CostTier = "standard" | "premium" | "luxury";

const SHELL_PER_M2: Record<CostTier, number> = { standard: 1400, premium: 2100, luxury: 3200 };
const OPENING_EACH: Record<CostTier, number> = { standard: 650, premium: 1100, luxury: 1900 };
const BATH_EACH: Record<CostTier, number> = { standard: 9000, premium: 16000, luxury: 28000 };
const KITCHEN_EACH: Record<CostTier, number> = { standard: 14000, premium: 26000, luxury: 45000 };

export interface CostLine {
  label: string;
  detail: string;
  amount: number;
}

export function estimateCost(a: HouseAnalysis, tier: CostTier): { lines: CostLine[]; total: number } {
  const baths = a.rooms.filter((r) => r.type === "bathroom").length;
  const kitchens = a.rooms.filter((r) => r.type === "kitchen").length;
  const openings = a.doors.length + a.windows.length;
  const lines: CostLine[] = [
    {
      label: "Shell and interiors",
      detail: `${a.metadata.totalArea.toFixed(1)} m2 at $${SHELL_PER_M2[tier].toLocaleString()}/m2`,
      amount: a.metadata.totalArea * SHELL_PER_M2[tier],
    },
    {
      label: "Doors and windows",
      detail: `${openings} openings at $${OPENING_EACH[tier].toLocaleString()} each`,
      amount: openings * OPENING_EACH[tier],
    },
    {
      label: "Bathrooms",
      detail: `${baths} at $${BATH_EACH[tier].toLocaleString()} each`,
      amount: baths * BATH_EACH[tier],
    },
    {
      label: "Kitchens",
      detail: `${kitchens} at $${KITCHEN_EACH[tier].toLocaleString()} each`,
      amount: kitchens * KITCHEN_EACH[tier],
    },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
