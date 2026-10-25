/**
 * calcSpriteResolve.ts - Species Sprite Resolution for the Calc Panels
 * Calc's `state.species` (useDamageCalc.ts/CalcPokemonState) is typed/
 * selected against @smogon/calc's own bundled species list, which carries no
 * national dex id the way a saved Team/Box entry's `pokedexNumber` does - a
 * live sprite preview needs one resolved on the fly instead.
 *
 * Reuses the same tiered lookup vgcPasteRowDisplay.ts's
 * resolveCatalogSpriteEntry already validated against real free-typed
 * species text (findRosterEntry's direct match, then
 * normalizeSpeciesForAPI's PokeAPI-slug fallback for bare default-forme
 * names with no bare PokeAPI resource - Aegislash, Palafin, Mimikyu, etc. -
 * see that file's header), plus the Mega-sprite cache
 * (hooks/useMegaSprite.ts) for Mega formes, which have no roster entry at
 * all. Doesn't reuse resolveCatalogSpriteEntry directly, though: its return
 * type only guarantees spriteUrl/shinySpriteUrl, dropping the roster entry's
 * own `id` - that id is fed into spriteUrl.ts's getPixelSpriteUrl here
 * instead of using the roster's precomputed spriteUrl as-is, so the small
 * set of purely-cosmetic gender variants (Pikachu/Eevee/Venusaur/Raichu/
 * Torchic/Wobbuffet - same national dex id, different sprite folder) still
 * render the right sprite for Calc's own gender toggle. Mega formes have no
 * such cosmetic-gender case modeled, so the cached Mega sprite is used as-is.
 */

import type { SpeciesRosterEntry } from '../types/pokemon';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { findRosterEntry } from './vgcPasteRowDisplay';
import { getPixelSpriteUrl } from './spriteUrl';
import { getCachedMegaSprite } from '../hooks/useMegaSprite';

export function resolveCalcPokemonSpriteUrl(
  species: string,
  gender: string,
  roster: SpeciesRosterEntry[],
): string {
  if (!species) return '';

  const megaSprite = getCachedMegaSprite(species.toLowerCase());
  if (megaSprite) return megaSprite.spriteUrl;

  const entry =
    findRosterEntry(species, roster) ?? findRosterEntry(normalizeSpeciesForAPI(species), roster);
  if (!entry) return '';

  return getPixelSpriteUrl(entry.id, species, gender || 'M', false);
}
