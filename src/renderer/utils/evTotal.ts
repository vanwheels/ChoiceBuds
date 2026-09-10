/**
 * Shared total-SP helper for the over-cap warning surfaced on TeamCard.tsx's
 * collapsed mini sprite strip and PokemonCard.tsx's header (Speed Tiers Save
 * Override: Over-Cap SP Warning, see TODO.md/COMPLETED.md) - a Speed Tiers
 * Preview Strip save only ever sees Speed's SP in isolation, unlike Team
 * Builder's own live 66-total cap gate in StatsColumn.tsx, so it can
 * legitimately push a saved team member's real total over 66. Deliberately
 * not wired into StatsColumn.tsx itself (which already inlines this same
 * reduce for its own live-editing total) - that file's gating logic reads
 * naturally as-is and isn't part of this leg's scope.
 */
import type { EVSpread } from '../types/pokemon';

export const MAX_TOTAL_SP = 66;

export function getTotalSP(evs: EVSpread): number {
  return Object.values(evs).reduce((sum, val) => sum + val, 0);
}
