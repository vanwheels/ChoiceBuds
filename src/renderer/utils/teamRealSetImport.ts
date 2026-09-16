/**
 * teamRealSetImport.ts - Load a VGCPastes Real-Set Bundle Into a Team Builder Slot
 * Team Builder counterpart to utils/calcTeamImport.ts's realSetBundleToCalcUpdates -
 * targets ShowdownPokemon (a real roster slot's PokemonCard.tsx, via
 * EditOverlays.tsx's own onUpdatePokemon(Partial<ShowdownPokemon>) contract)
 * instead of Calc's CalcPokemonState. Powers RealSetsButton.tsx's
 * pick-a-bundle-to-fill-this-slot interaction (Team Builder Real Sets
 * Integration Leg 2, see TODO.md and
 * docs/investigations/team-builder-real-sets-scope.md).
 *
 * Trivial field copy, same as the Calc mapper - VgcRealSetBundle.evs already
 * uses the same hp/attack/defense/specialAttack/specialDefense/speed field
 * names as ShowdownPokemon.evs, so no SP-scale conversion is needed either.
 * A bundle has no species/gender/level of its own (it was already extracted
 * for whichever species this card is currently on), so this only ever
 * touches item/ability/nature/moves/evs.
 */

import type { ShowdownPokemon, VgcRealSetBundle } from '../types/pokemon';

const MOVE_SLOT_COUNT = 4;

export function realSetBundleToShowdownUpdates(bundle: VgcRealSetBundle): Partial<ShowdownPokemon> {
  return {
    item: bundle.item || '',
    ability: bundle.ability || '',
    nature: bundle.nature || 'Hardy',
    evs: bundle.evs,
    moves: Array.from({ length: MOVE_SLOT_COUNT }, (_, i) => bundle.moves[i] || ''),
  };
}
