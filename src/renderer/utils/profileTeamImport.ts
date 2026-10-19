/**
 * Pure conversion of a public profile's open-tier team data (`PublicTeam`,
 * as served by `GET /profile/:username` - see worker/src/publicProfile.ts)
 * into this app's own `ShowdownPokemon`/`Team` shapes - split out of
 * ProfilePage.tsx (Save/Import a Team From a Profile, see TODO.md) so the
 * species/moves/items/EVs/nature mapping it's responsible for getting
 * right is unit-testable without mounting React.
 */

import { DEFAULT_EVS } from '../services/parser';
import { isRegulationLabel } from './pokemonRules';
import type { PublicTeam } from '../services/syncApi';
import type { RegulationLabel, ShowdownPokemon } from '../types/pokemon';

function normalizeGender(gender?: string): 'M' | 'F' | 'N' | '' {
  return gender === 'M' || gender === 'F' || gender === 'N' ? gender : '';
}

/**
 * One `PublicTeam` Pokémon entry down to a `ShowdownPokemon` ready for
 * `enrichPokemonWithAPI` - only ever called for an `open`-visibility team,
 * whose entries always carry the full competitive set
 * `extractPublicPokemon` attaches server-side. Missing optional fields fall
 * back to the same defaults `parser.ts` uses for a fresh Showdown-text
 * import, not `undefined`, since `ShowdownPokemon.level`/`shiny`/
 * `gigantamax`/`happiness`/`evs`/`moves` aren't optional on that type.
 */
export function buildShowdownPokemonFromPublic(p: PublicTeam['pokemon'][number]): ShowdownPokemon {
  return {
    nickname: p.nickname,
    species: p.species,
    gender: normalizeGender(p.gender),
    item: p.item,
    ability: p.ability,
    level: p.level ?? 50,
    shiny: p.shiny ?? false,
    gigantamax: p.gigantamax ?? false,
    happiness: p.happiness ?? 255,
    teraType: p.teraType,
    nature: p.nature,
    evs: p.evs ?? { ...DEFAULT_EVS },
    moves: p.moves ?? [],
  };
}

/**
 * Resolves a `PublicTeam`'s own `format` (plain `string` over the wire,
 * not the renderer's `RegulationLabel` union) back to a real
 * `RegulationLabel`, falling back to the importing account's own default
 * regulation when it doesn't match one - e.g. a regulation label this
 * build doesn't recognize yet.
 */
export function resolveImportedTeamFormat(
  format: string,
  fallback: RegulationLabel,
): RegulationLabel {
  return isRegulationLabel(format) ? format : fallback;
}
