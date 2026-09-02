/**
 * Battle Logger domain types - a single manually-logged Pokemon Champions VGC
 * battle (doubles), its turn-by-turn action log, and persisted battle
 * storage. Split out of types/pokemon.ts (see CLAUDE.md's Architecture
 * section) - Battle Logger's UI is archived, but Battle/BattlesDatabase are
 * still live (useBattles.ts persists them, useSync.ts syncs them).
 */

import type { EVSpread, StatStages, Team } from './pokemon';

export type BattleSide = 'player' | 'opponent';

/**
 * Frozen copy of one of the team's up-to-6 Pokemon at battle-start time,
 * independent of the live Team/ImportedPokemonInfo (which has no stable
 * per-Pokemon id) - editing or deleting the source team later never
 * touches a past log. Not all of these are necessarily brought to this
 * battle - see Battle.broughtIds.
 */
export interface BroughtPokemonSnapshot {
  id: string; // fresh crypto.randomUUID(), unrelated to the source Team's data
  species: string;
  nickname?: string;
  ability?: string;
  item?: string;
  teraType?: string;
  moves: string[];
  gender?: 'M' | 'F' | 'N' | '';
  pokedexNumber: number;
  types: string[];
  spriteUrl: string;
  // Snapshotted at battle start alongside the rest of this Pokemon's set -
  // needed for the post-battle damage-calc review (utils/battleCalcReview.ts)
  // since neither was ever in Battle before. Optional since battles logged
  // before this field existed won't have it - no migration, just a graceful
  // blank in the calc review for those.
  nature?: string;
  evs?: EVSpread;
  level?: number;
}

/**
 * One opponent Pokemon as revealed during a battle. Grows incrementally as
 * the user adds foes they see - ephemeral, per-battle only, never persisted
 * or aggregated across battles.
 */
export interface OpponentPokemonEntry {
  id: string;
  species: string;
  pokedexNumber: number;
  spriteUrl: string;
  types: string[]; // fetched live at add-time (see useBattleLogActions.ts::addOpponentPokemon) - powers type-effectiveness tags
  moves: string[]; // revealed moves, a growable tag list (not a fixed 4)
  ability?: string;
  item?: string;
  itemConsumed?: boolean; // true once a one-time consumable item (berry, Focus Sash, etc.) has triggered - see config/vgcData.ts::isConsumableItem
  // Which turn `ability`/`item` most recently changed to their current value
  // (see useBattleLogActions.ts::updateOpponentMoveTags/setMegaEvolved) -
  // without this, the post-battle damage-calc review (utils/battleCalcReview.ts)
  // reviewing an early turn would leak info only actually learned later.
  abilityRevealedOnTurn?: number;
  itemRevealedOnTurn?: number;
  fainted: boolean;
  addedAt: number; // Unix timestamp
}

/**
 * One logged action within a turn. `move`/`note` are freeform strings, not
 * an enum, so "Protect", "fainted to residual" etc. all just live in `note`
 * - this is a flexible manual log, not a rigid simulator. `target` is an
 * array since spread moves can hit 2 Pokemon at once. `phase` orders
 * display within a turn (send-ins/switches, then Mega Evolutions, then
 * moves, regardless of the order they were tapped in) - undefined is
 * treated as `'move'` so pre-existing logged actions still render
 * correctly. `'sendIn'` (an empty slot being filled - the start of battle
 * or a fainted slot's replacement) never costs the slot's turn action;
 * `'switch'` (a manual mid-turn swap of an already-occupied slot, or the
 * continuation of a switch-out move like U-turn) does - see
 * canActThisTurn/canSwitchOutThisTurn in utils/battleLookup.ts. `failed`
 * is only meaningful for Protect-family moves - see config/protectMoves.ts.
 */
export interface BattleAction {
  id: string;
  side: BattleSide;
  pokemonId: string; // id into playerRoster (player) or opponentRoster (opponent)
  move?: string;
  target?: { side: BattleSide; pokemonId: string }[];
  phase?: 'sendIn' | 'switch' | 'mega' | 'move';
  failed?: boolean;
  note?: string;
  // Type-effectiveness multiplier per target, computed at log time from the
  // move's type and each target's types (see config/typeEffectiveness.ts) -
  // only present for damaging moves, absent for status moves/self/field.
  effectiveness?: { pokemonId: string; multiplier: number }[];
  // Per-target hit outcome for a landed move - a spread move (Rock Slide,
  // Earthquake) can crit one target and miss another independently.
  // Manually confirmed, not computed - the user is watching the real
  // battle and taps these when they observe it. Mutually exclusive by
  // construction (one result per target entry) - a miss can't also crit.
  // No entry for a given target = a plain, unremarkable hit. `no-effect`/
  // `blocked-ability` cover cases the auto-computed `effectiveness`
  // multiplier above can't (ability-based immunity like Levitate/
  // Bulletproof, or any no-effect result on a status move, which gets no
  // `effectiveness` entry at all since that field is damaging-move-only).
  outcomes?: { pokemonId: string; result: 'crit' | 'miss' | 'no-effect' | 'blocked-ability' }[];
  // How many times a multi-hit move (Bullet Seed, Population Bomb, Triple
  // Axel, etc. - see config/multiHitMoves.ts) actually connected against a
  // given target, manually confirmed same as `outcomes` above. No entry =
  // not recorded (either the move isn't multi-hit, or the user hasn't
  // logged a count yet) - never inferred from the move's own hit range,
  // since the real count is random per use. Not meaningful alongside a
  // 'miss'/'no-effect'/'blocked-ability' outcome for the same target (0
  // hits landed either way) - see setActionTargetOutcome's clearing of
  // this on those results.
  hitsLanded?: { pokemonId: string; hits: number }[];
  // The move's type/damage-class, snapshotted at log time (same pattern as
  // effectiveness above) - lets utils/battleLookup.ts's hit-reactive-ability
  // check (config/hitReactiveAbilities.ts) work from the stored action alone
  // without re-fetching move data. Absent for non-damaging/self/field moves.
  moveType?: string;
  moveCategory?: 'physical' | 'special' | 'status';
  // The status this move guaranteed-inflicts on hit (PokeAPI's
  // meta.ailment_chance === 100 - see config/statusConditions.ts's
  // mapAilmentToStatus), snapshotted at log time same as moveType/
  // moveCategory above. Drives TurnLog's "Inflict {Status}?" chip - absent
  // for moves with no guaranteed/tracked status effect.
  statusAilment?: StatusCondition;
}

/**
 * A single in-game turn: an ordered sequence of actions exactly as observed
 * live (doubles = up to 4 actions/turn, 2 per side). No attempt is made to
 * predict/compute turn order from priority/abilities/speed - the user is
 * watching the real battle and records what actually happened, in order.
 */
export interface Turn {
  number: number;
  actions: BattleAction[];
}

export type WeatherType = 'rain' | 'sun' | 'sand' | 'snow';
export type TerrainType = 'electric' | 'grassy' | 'misty' | 'psychic';

/**
 * One side's screens/Tailwind/hazards. Turn-tracked fields (tailwind
 * through mist) store the turn number they were set on, not a live
 * countdown - see config/fieldConditions.ts's getRemainingTurns for how the
 * displayed countdown is derived, and useBattleLogActions.ts's
 * toggleTurnCondition for how they're set/cleared. Hazards have no
 * duration and persist until manually cleared (Rapid Spin/Defog/etc.).
 */
export interface SideConditions {
  tailwind?: number;
  reflect?: number;
  lightScreen?: number;
  auroraVeil?: number;
  safeguard?: number;
  mist?: number;
  stealthRock?: boolean;
  stickyWeb?: boolean;
  spikes?: number; // 0-3 layers
  toxicSpikes?: number; // 0-2 layers
  // Light Clay extends Reflect/Light Screen/Aurora Veil to 8 turns instead of
  // the standard 5 - Tailwind/Safeguard/Mist have no extending item in this
  // game, so they have no equivalent flag. See config/fieldConditions.ts.
  reflectExtended?: boolean;
  lightScreenExtended?: boolean;
  auroraVeilExtended?: boolean;
}

/**
 * Current field state for a battle - a single live snapshot (not per-turn
 * history), matching the existing playerActiveIds/opponentActiveIds
 * pattern. Weather/terrain are field-wide; screens/hazards are per-side.
 * `wasMegaEvolved` drives duration confidence in FieldWeatherBar - a Mega's
 * ability-triggered weather/terrain is always the fixed 5-turn duration
 * (a Mega Stone occupies the item slot, so no duration-extending rock is
 * possible), while a regular ability trigger is uncertain (5 or 8 turns,
 * depending on an unrevealed held rock).
 */
export interface FieldState {
  weather?: { type: WeatherType; setOnTurn: number; wasMegaEvolved?: boolean };
  terrain?: { type: TerrainType; setOnTurn: number; wasMegaEvolved?: boolean };
  trickRoom?: { setOnTurn: number }; // always move-set, fixed 5-turn duration - never ability-triggered, so no mega confidence needed
  playerSide: SideConditions;
  opponentSide: SideConditions;
}

/**
 * A Pokemon's current major status condition. Deliberately scoped to the 6
 * real major statuses only (one slot per Pokemon, matching the real game
 * rule that only one major status can be active at a time) - volatile
 * conditions (confusion, infatuation, trap, etc.) are excluded, since a
 * Pokemon can hold one of those *simultaneously* with a major status, which
 * this single-slot model can't express. Not modeled yet; revisit as its own
 * follow-up if it turns out to matter for logging.
 */
export type StatusCondition = 'burn' | 'freeze' | 'paralysis' | 'poison' | 'badly-poisoned' | 'sleep';

/**
 * One manually-logged Pokemon Champions VGC battle (doubles). See
 * useBattleLogActions.ts for the higher-level mutations that build/update
 * these records.
 */
export interface Battle {
  id: string;
  date: number; // Unix timestamp
  teamId: string; // links back to the source Team (may later be edited/deleted)
  teamName: string; // snapshot - display never breaks if the team is renamed/deleted
  format: Team['format'];
  // Bo3 set grouping (see utils/battleSets.ts) - every battle belongs to a
  // set of at least 1 (itself), so a standalone/casual battle with no
  // opponentName renders with no Bo3 framing at all, same as before this
  // existed. Always defined (useBattleLogActions.ts::startBattle assigns a
  // fresh one, or adopts an existing incomplete set's id when the typed
  // opponentName matches - useBattles.ts::normalizeBattle backfills `id`
  // itself for battles logged before this field existed).
  setId: string;
  opponentName?: string; // free-text opponent identity, only ever set if the user typed one when starting the battle
  playerRoster: BroughtPokemonSnapshot[]; // all of the team brought to Team Preview, up to 6
  broughtIds: string[]; // 0-4 ids from playerRoster - which of the 6 were actually brought to this battle
  // Fixed 2-element tuple - index IS the left/right field position, `null` = empty.
  // Never shrunk/spliced when a Pokemon leaves, so the other slot's position
  // never shifts - see utils/battleLookup.ts's compactActiveIds for call
  // sites that just need a plain id list.
  playerActiveIds: (string | null)[]; // ids from broughtIds
  playerFaintedIds: string[]; // ids from playerRoster
  opponentRoster: OpponentPokemonEntry[]; // starts empty, grows during the battle
  opponentActiveIds: (string | null)[]; // ids from opponentRoster, same fixed-slot shape as playerActiveIds
  megaEvolvedIds: string[]; // ids (either roster) that have Mega Evolved this battle
  statStages: Record<string, StatStages>; // keyed by pokemonId, either roster - cleared when that id leaves the field (bench/faint)
  // Keyed by pokemonId, either roster - same shape as statStages, but unlike
  // stat stages a major status persists through switching/fainting in the
  // real game, so this is never cleared by setFainted/switchOut/swapActive.
  statusConditions: Record<string, StatusCondition>;
  // Keyed by pokemonId, either roster - the turn number `statusConditions[id]`
  // was most recently set on (mirrors FieldState.weather's `setOnTurn`).
  // Powers BattlefieldSlot's sleep-turn-count badge; entries are added/
  // removed in lockstep with statusConditions by setStatusCondition.
  statusSetOnTurn: Record<string, number>;
  turns: Turn[];
  fieldState: FieldState;
  result: 'win' | 'loss' | 'in-progress';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BattlesDatabase {
  version: number;
  battles: Battle[];
  lastModified: number; // Unix timestamp
}
