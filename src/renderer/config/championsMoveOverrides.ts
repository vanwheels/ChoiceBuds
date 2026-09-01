/**
 * Champions Move Balance Overrides
 * PokeAPI (our only runtime data source per CLAUDE.md) models mainline
 * Scarlet/Violet - it has no concept of Pokemon Champions as a distinct
 * game with its own balance patches. This file hand-corrects the moves
 * Champions has actually changed, verified against:
 *   smogon/pokemon-showdown's code-level `champions` mod
 *     (data/mods/champions/{moves,scripts}.ts on GitHub, `master` branch) -
 *     the primary reference as of 2026-09-01 (see CLAUDE.md's sixth
 *     external-source exception). Ladder-verified simulator code,
 *     not a summarized reference page or a screenshot-relayed spreadsheet -
 *     every entry below was cross-checked against it and every override
 *     confirmed to match (see docs/investigations/champions-showdown-mod-audit.md
 *     for the full pass). Its raw per-move `pp` field is a PRE-transform
 *     value, not the final displayed PP - see the CHAMPIONS_PP_EXCEPTIONS
 *     comment below for how that reconciles with our own numbers.
 *   https://www.serebii.net/pokemonchampions/updatedattacks.shtml
 *   https://bulbapedia.bulbagarden.net/wiki/Pokémon_Champions
 *     ("Changes from Scarlet and Violet and Generation VIII")
 *   "Data Comparative Champions" - a community spreadsheet by RoiDadadou
 *     (Discord: roidadadou), cross-referencing datamined values from
 *     Kaphotics and Anubis plus battle-mechanics research from DaWoblefet.
 *     Provided directly by the user via screenshots (last updated by its
 *     author 2026-06-16) - not fetched live, same as the Reddit movepool
 *     thread in championsMovepoolChanges.ts. Superseded by the Showdown mod
 *     above wherever the two would conflict, but still useful for entries
 *     Showdown's mod doesn't cover in a directly-portable form (e.g. the
 *     hand-written descriptions below).
 * Applied at the READ boundary (useGameData.ts's getCachedMove/getMoveData),
 * not at fetch time - so it's self-healing against move data already sitting
 * in a user's 30-day game-data-cache.json, and any future correction here
 * takes effect immediately with no cache-version bump needed.
 *
 * This is a living document - Champions has already patched moves at least
 * once post-launch (v1.1); re-check these sources periodically rather than
 * treating this file as permanently complete.
 */

import type { MoveData } from '../types/pokemon';
import { normalizeNameForAPI } from '../services/pokeapiService';
import type { TypeName } from '@smogon/calc/dist/data/interface';

/** Fields we know how to correct, in our own MoveData's naming/casing. */
export interface ChampionsMoveOverride {
  power?: number | null;
  accuracy?: number | null;
  type?: string;
  description?: string;
}

const CHAMPIONS_MOVE_OVERRIDES: Record<string, ChampionsMoveOverride> = {
  'growth': {
    type: 'grass',
    description: "Boosts the user's Attack and Sp. Atk by 1 stage (2 in harsh sunlight).",
  },
  'crabhammer': { accuracy: 95, description: 'Has a high critical-hit ratio.' },
  'bone-rush': { power: 30 },
  'iron-head': { description: "Has a 20% chance to make the target flinch." },
  'night-daze': { power: 90 },
  'moonblast': { description: "Has a 10% chance to lower the target's Sp. Atk by 1 stage." },
  'first-impression': { power: 100 },
  'spirit-shackle': { power: 90 },
  'fire-lash': { power: 90 },
  'trop-kick': { power: 85 },
  'beak-blast': { power: 120 },
  'snap-trap': { type: 'steel' },
  'apple-acid': { power: 90 },
  'grav-apple': { power: 90 },
  'dire-claw': { description: "Has a 30% chance to poison, paralyze, or put the target to sleep. Considered a slicing move." },
  'psyshield-bash': { power: 90 },
  'mountain-gale': { power: 120 },
  'infernal-parade': { power: 65 },
  'make-it-rain': {
    accuracy: 95,
    description: "Lowers the user's Sp. Atk by 2 stages.",
  },
  'syrup-bomb': { accuracy: 90 },
  'dragon-cheer': { description: 'A sound-based move. Boosts the Dragon-type ally’s critical-hit ratio more than others.' },
  'salt-cure': { description: "Deals damage each turn: 1/16 max HP normally, 1/8 against Water/Steel-types." },
  'toxic-thread': { description: "Poisons the target and lowers its Speed by 2 stages." },
  'rage-fist': { description: 'Power increases each time the user is hit (up to 350 BP), and resets if the user switches out.' },
  'freeze-dry': { description: 'Super effective against Water-types regardless of type. Can no longer inflict freeze.' },
  'crush-claw': { description: 'Considered a slicing move.' },
  'shadow-claw': { description: 'Considered a slicing move. High critical-hit ratio.' },
  'dragon-claw': { description: 'Considered a slicing move.' },

  /**
   * These 11 entries originally came only from the spreadsheet's "Move Ch."
   * tab, with no Serebii/Bulbapedia corroboration and no Champions Pokemon
   * yet able to use most of them in practice (several are signature moves
   * for species not yet in the game, e.g. Blood Moon/Ursaluna, Dragon
   * Hammer/Zygarde) - so they were carried as lower-confidence. All 11 are
   * now confirmed present with matching values in Showdown's
   * ladder-verified `champions` mod (see the header comment above), so
   * that framing no longer applies; kept as their own block only because
   * they were already grouped this way, not because they're still
   * considered less trustworthy than the entries above.
   */
  'gear-grind': { power: 60, accuracy: 90 },
  'anchor-shot': { power: 90 },
  'revelation-dance': { power: 100 },
  'dragon-hammer': { power: 100 },
  'snipe-shot': { power: 85 },
  'bolt-beak': { power: 80 },
  'fishious-rend': { power: 80 },
  'astral-barrage': { power: 110 },
  'triple-dive': { power: 35 },
  'hyper-drill': { power: 120 },
  'blood-moon': { power: 130 },
  'clangorous-soul': {
    accuracy: null,
    description: "Boosts the user's Attack, Sp. Atk, and Speed by 1 stage, at the cost of 1/3 of its max HP. Never misses.",
  },
};

/**
 * PP is retiered game-wide (not just for the moves above): 5->8, 10->12,
 * 15->16, and anything 20+ collapses to a flat 20 - except for the 13 moves
 * below, which got a different value than the formula would predict.
 *
 * Both the game-wide formula and every value below are confirmed against
 * Showdown's `champions` mod (see the header comment above):
 * `scripts.ts`'s `calculatePP(move, ppUps)` is `(move.pp / 5 + 1) * 4`,
 * always - `ppUps` is ignored, so Champions has no per-Pokemon partial PP
 * Up scaling, just one final number per move. Its own `moves.ts` `pp`
 * field is the PRE-transform input to that formula, not the number to
 * copy directly - e.g. Beak Blast's raw `pp: 5` runs through the formula
 * to 8, matching both our existing value here and Serebii's directly-
 * stated "8 PP" for it. An earlier pass (see the investigation doc) read
 * the raw field as if it were the final value and flagged a false
 * discrepancy against these numbers; running it through calculatePP
 * instead reproduces every value below exactly, including the game-wide
 * formula's own 5->8/10->12/15->16 buckets (raw PP >20 gets capped to 20
 * before the formula runs too, per `scripts.ts`'s `init()`, landing on the
 * same flat 20 our ">=20" bucket already produces).
 */
const CHAMPIONS_PP_EXCEPTIONS: Record<string, number> = {
  'baneful-bunker': 8,
  'kings-shield': 8,
  'protect': 8,
  'spiky-shield': 8,
  'beak-blast': 8,
  'night-slash': 20,
  'sandstorm': 8,
  'snowscape': 8,
  'purify': 8,
  'shell-trap': 12,
  'obstruct': 8,
  'spin-out': 12,
  'nihil-light': 8,
};

export function getChampionsPP(moveName: string, basePP: number): number {
  const slug = normalizeNameForAPI(moveName);
  const exception = CHAMPIONS_PP_EXCEPTIONS[slug];
  if (exception !== undefined) return exception;

  if (basePP === 5) return 8;
  if (basePP === 10) return 12;
  if (basePP === 15) return 16;
  if (basePP >= 20) return 20;
  return basePP;
}

/** Applies any known Champions override to a PokeAPI-sourced MoveData, plus the PP retier. */
export function applyChampionsMoveOverride(move: MoveData): MoveData {
  const slug = normalizeNameForAPI(move.name);
  const override = CHAMPIONS_MOVE_OVERRIDES[slug];
  return {
    ...move,
    ...(override ?? {}),
    pp: getChampionsPP(move.name, move.pp),
  };
}

/**
 * Maps our override naming to @smogon/calc's Partial<I.Move> shape
 * (basePower/type in Title Case) for the live damage calculator. Returns
 * undefined for moves with no override, matching the shape Move's own
 * `overrides` constructor option expects (see useDamageCalc.ts).
 */
export function getChampionsCalcMoveOverride(moveName: string): { basePower?: number; type?: TypeName } | undefined {
  const slug = normalizeNameForAPI(moveName);
  const override = CHAMPIONS_MOVE_OVERRIDES[slug];
  if (!override) return undefined;

  const calcOverride: { basePower?: number; type?: TypeName } = {};
  if (override.power != null) calcOverride.basePower = override.power;
  if (override.type) calcOverride.type = (override.type.charAt(0).toUpperCase() + override.type.slice(1)) as TypeName;
  return Object.keys(calcOverride).length > 0 ? calcOverride : undefined;
}
