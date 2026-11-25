/**
 * Champions Regulation-Scoped Balance Patches
 *
 * The other Champions override tables (championsMoveOverrides.ts,
 * championsAbilityOverrides.ts, championsMovepoolChanges.ts) apply to every
 * regulation. That's right for launch-era corrections, but a balance patch
 * that ships alongside a new regulation must not leak back into older
 * regulations' calcs or team text (Vanny's rule, see
 * docs/investigations/reg-m-d.md §7). Entries here are tagged with the
 * regulation they start in and apply to that regulation and every later one
 * (ALL_REGULATION_IDS order).
 *
 * Applied by the same read-boundary helpers as the global tables, after
 * them, so a dated entry wins over a global one for the same field.
 * Movepool additions apply after every removal (global, gated and patch),
 * so a patch can re-grant a move an older table removes (Mr. Mime's Psych
 * Up in Reg M-D).
 *
 * Data only: the apply logic lives beside each global table, so tests can
 * mock this module with a test entry while exercising the real logic.
 */

import type { AbilityData } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import type { ChampionsMoveOverride } from './championsMoveOverrides';

/** One dated change, effective from `since` onward. */
export interface DatedPatch<T> {
  since: RegulationId;
  change: T;
}

/** Keyed by normalized move slug (normalizeNameForAPI). */
export const CHAMPIONS_DATED_MOVE_PATCHES: Record<string, DatedPatch<ChampionsMoveOverride>[]> = {
  // Dec 2 2026 balance patch (reg-m-d.md §4). Accuracy is display-only: the
  // damage calc ignores it, so getChampionsCalcMoveOverride maps none of these.
  screech: [{ since: 'REG-MD', change: { accuracy: 100 } }],
  'metal-sound': [{ since: 'REG-MD', change: { accuracy: 100 } }],
  'steel-wing': [{ since: 'REG-MD', change: { accuracy: 100 } }],
  'frost-breath': [{ since: 'REG-MD', change: { accuracy: 100 } }],
  // No secondary-chance field exists, so the flinch change rides on the
  // description, same as iron-head's global row.
  'rock-slide': [
    {
      since: 'REG-MD',
      change: { accuracy: 95, description: 'Has a 20% chance to make the target flinch.' },
    },
  ],
};

/** Keyed by normalized ability slug (normalizeNameForAPI). */
export const CHAMPIONS_DATED_ABILITY_PATCHES: Record<string, DatedPatch<Partial<AbilityData>>[]> =
  {};

/**
 * Keyed by the learnset's species slug (SpeciesLearnsetEntry.species), same
 * key as CHAMPIONS_PATCH_MOVEPOOL_REMOVALS. Each form with its own PokeAPI
 * slug (e.g. `rotom-heat`) needs its own row. Not gated on
 * hasChampionsMoveData: PokeAPI's tag snapshot predates any post-launch
 * patch, so it can't already contain these.
 */
export const CHAMPIONS_DATED_MOVEPOOL_ADDITIONS: Record<string, DatedPatch<string[]>[]> = {
  // Dec 2 2026 balance patch (reg-m-d.md §5). Mr. Mime's psych-up is also in
  // the gated CHAMPIONS_MOVEPOOL_REMOVALS; additions run last, so it stays.
  alakazam: [{ since: 'REG-MD', change: ['psych-up'] }],
  starmie: [{ since: 'REG-MD', change: ['psych-up'] }],
  'mr-mime': [{ since: 'REG-MD', change: ['psych-up'] }],
  mawile: [{ since: 'REG-MD', change: ['psych-up'] }],
  altaria: [{ since: 'REG-MD', change: ['psych-up'] }],
  castform: [{ since: 'REG-MD', change: ['psych-up'] }],
  absol: [{ since: 'REG-MD', change: ['psych-up'] }],
  roserade: [{ since: 'REG-MD', change: ['psych-up'] }],
  weavile: [{ since: 'REG-MD', change: ['psych-up'] }],
  rotom: [{ since: 'REG-MD', change: ['psych-up'] }],
  'rotom-heat': [{ since: 'REG-MD', change: ['psych-up'] }],
  'rotom-wash': [{ since: 'REG-MD', change: ['psych-up'] }],
  'rotom-frost': [{ since: 'REG-MD', change: ['psych-up'] }],
  'rotom-fan': [{ since: 'REG-MD', change: ['psych-up'] }],
  'rotom-mow': [{ since: 'REG-MD', change: ['psych-up'] }],
  liepard: [{ since: 'REG-MD', change: ['psych-up'] }],
  musharna: [{ since: 'REG-MD', change: ['psych-up'] }],
  audino: [{ since: 'REG-MD', change: ['psych-up'] }],
  cofagrigus: [{ since: 'REG-MD', change: ['psych-up'] }],
  slurpuff: [{ since: 'REG-MD', change: ['psych-up'] }],
  drampa: [{ since: 'REG-MD', change: ['psych-up'] }],
  annihilape: [{ since: 'REG-MD', change: ['psych-up'] }],
  emboar: [{ since: 'REG-MD', change: ['slack-off'] }],
  beedrill: [{ since: 'REG-MD', change: ['roost'] }],
  hydreigon: [{ since: 'REG-MD', change: ['roost'] }],
  emolga: [{ since: 'REG-MD', change: ['tailwind'] }],
  vaporeon: [{ since: 'REG-MD', change: ['play-rough'] }],
  jolteon: [{ since: 'REG-MD', change: ['play-rough'] }],
  flareon: [{ since: 'REG-MD', change: ['play-rough'] }],
  espeon: [{ since: 'REG-MD', change: ['play-rough'] }],
  umbreon: [{ since: 'REG-MD', change: ['wonder-room', 'play-rough'] }],
  leafeon: [{ since: 'REG-MD', change: ['play-rough'] }],
  glaceon: [{ since: 'REG-MD', change: ['play-rough'] }],
};
