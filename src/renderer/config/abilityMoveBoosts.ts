/**
 * Ability-Boosts-Move Rules (Ability-Affects-Move Indicator)
 * Feeds the per-move "does this Pokemon's equipped ability boost this
 * equipped move's power" check surfaced on EditOverlays.tsx's children
 * (MoveBubbleGrid.tsx's corner badge, TooltipContent.tsx's effect text) -
 * see docs/investigations/ability-affects-move-indicator.md for the full
 * scope. Four rule shapes cover every real case, same "one union per real
 * mechanic" pattern as config/typeChangingAbilities.ts's TypeChangeRule/
 * config/moveBlockingAbilities.ts's BlockRule:
 *
 * - `flag`: the move carries one of config/moveFlags.ts's MoveFlagKey tags
 *   (Iron Fist/punch, Strong Jaw/bite, Mega Launcher/pulse, Tough Claws/
 *   contact - `contact` is excluded from moveFlags.ts's VISIBLE_MOVE_FLAGS
 *   display set, but still present in MoveData.flags, so it's usable here).
 * - `effective-type`: the move's *effective* type (post any type-changing
 *   ability, via config/typeChangingAbilities.ts::getEffectiveMoveType)
 *   matches the ability's boosted type (Steely Spirit/Steel, Transistor/
 *   Electric, Dragon's Maw/Dragon).
 * - `retype-conversion`: the 5 abilities that both retype AND boost -
 *   Pixilate/Aerilate/Refrigerate/Galvanize/Normalize, already modeled in
 *   typeChangingAbilities.ts's TypeChangeRule but explicitly out of that
 *   file's own narrower "type coverage only" scope (see its header). This
 *   is NOT simply "effective type matches the ability's target type" -
 *   Aerilate's 1.2x only applies to a move that was actually *converted*
 *   from Normal, not to a move that happened to already be Flying-type
 *   (confirmed on Bulbapedia's Aerilate page: the boost/retype excludes
 *   moves that are "not normally Normal-type"). Normalize is the one real
 *   exception to that: it boosts every move, including ones that were
 *   already Normal-type to begin with, since it unconditionally retypes
 *   everything - see getAbilityMoveBoostMultiplier's own `normalize`
 *   special-case below rather than re-deriving typeChangingAbilities.ts's
 *   private per-ability rule table (which isn't exported) from the outside.
 *   Liquid Voice is deliberately excluded from this rule kind - it retypes
 *   sound moves to Water but, unlike the other 5, doesn't boost their
 *   power at all.
 * - `power-threshold`: Technician, `power <= 60`. Must read MoveData.power
 *   directly (the raw, pre-boost base power) - Technician's own 1.5x must
 *   never be a factor in whether the move clears the threshold it itself
 *   creates.
 * - `move-list`: Sheer Force - boosts any move with a secondary effect
 *   PokeAPI's MoveData.meta doesn't fully capture (a chance-based stat
 *   change like Rock Smash's 50% Def-1 isn't derivable from `meta` alone -
 *   see config/moveStatEffects.ts's header for the same "can't confirm it
 *   fired" gap). Hand-curated from Serebii's dedicated Sheer Force page
 *   (serebii.net/abilitydex/sheerforce.shtml, project policy exception #2),
 *   filtered against config/championsMovepoolChanges.ts's
 *   GLOBALLY_REMOVED_MOVES (moves absent from Champions entirely, including
 *   Secret Power/Nature Power - see that file's header) since Serebii's
 *   list covers mainline moves with no Champions availability at all.
 *
 * Multipliers are each ability's standard current-gen value (researched
 * against Bulbapedia, 2026-10-23) - included so a consumer can render
 * "+20% power" text directly rather than needing a second lookup.
 *
 * Ability keys use the same toSlug convention (lowercase, spaces ->
 * hyphens, apostrophes kept as-is) as typeChangingAbilities.ts/
 * moveBlockingAbilities.ts/hitReactiveAbilities.ts, each with its own
 * private copy rather than a shared export - same precedent. Move-list
 * entries are PokeAPI-style lowercase hyphenated slugs matching
 * MoveData.name directly (this table matches against MoveData, not a
 * Battle Logger-logged display string, unlike moveBlockingAbilities.ts's
 * Title-Case SOUND_BASED_MOVES).
 */

import type { MoveData } from '../types/gameData';
import type { MoveFlagKey } from './moveFlags';
import { getEffectiveMoveType } from './typeChangingAbilities';

export type AbilityMoveBoostMatch =
  | { kind: 'flag'; flag: MoveFlagKey }
  | { kind: 'effective-type'; type: string }
  | { kind: 'retype-conversion' }
  | { kind: 'power-threshold'; maxPower: number }
  | { kind: 'move-list'; moves: string[] };

export interface AbilityMoveBoostRule {
  match: AbilityMoveBoostMatch;
  multiplier: number;
}

/**
 * Serebii's Sheer Force attack-table list, filtered to moves that exist in
 * Champions at all (see file header) - see docs/investigations/
 * ability-affects-move-indicator.md for the sourcing decision. Secret
 * Power/Nature Power are excluded both by this filter (both are in
 * championsMovepoolChanges.ts's GLOBALLY_REMOVED_MOVES) and in their own
 * right, since their actual secondary effect varies by environment rather
 * than being fixed.
 */
const SHEER_FORCE_MOVES = [
  'acid-spray',
  'air-slash',
  'ancient-power',
  'axe-kick',
  'barb-barrage',
  'bite',
  'blaze-kick',
  'blizzard',
  'body-slam',
  'bone-club',
  'bounce',
  'breaking-swipe',
  'bug-buzz',
  'bulldoze',
  'chatter',
  'chilling-water',
  'cross-poison',
  'crunch',
  'crush-claw',
  'dark-pulse',
  'discharge',
  'dire-claw',
  'dizzy-punch',
  'dragon-rush',
  'earth-power',
  'energy-ball',
  'extrasensory',
  'fiery-dance',
  'fire-blast',
  'fire-fang',
  'fire-lash',
  'fire-punch',
  'flamethrower',
  'flare-blitz',
  'flash-cannon',
  'focus-blast',
  'gunk-shot',
  'heart-stamp',
  'heat-wave',
  'hurricane',
  'ice-beam',
  'ice-fang',
  'ice-punch',
  'icicle-crash',
  'icy-wind',
  'infernal-parade',
  'inferno',
  'iron-head',
  'iron-tail',
  'lava-plume',
  'leaf-tornado',
  'liquidation',
  'low-sweep',
  'lumina-crash',
  'lunge',
  'meteor-mash',
  'mirror-shot',
  'moonblast',
  'mortal-spin',
  'mountain-gale',
  'mud-shot',
  'mud-slap',
  'muddy-water',
  'mystical-fire',
  'needle-arm',
  'night-daze',
  'nuzzle',
  'octazooka',
  'play-rough',
  'poison-fang',
  'poison-jab',
  'pounce',
  'psychic',
  'razor-shell',
  'rock-slide',
  'rolling-kick',
  'scald',
  'searing-shot',
  'shadow-ball',
  'shadow-bone',
  'silver-wind',
  'sky-attack',
  'sludge-bomb',
  'sludge-wave',
  'snore',
  'stoked-sparksurfer',
  'throat-chop',
  'thunder',
  'thunder-fang',
  'thunder-punch',
  'thunderbolt',
  'trailblaze',
  'tri-attack',
  'triple-arrows',
  'trop-kick',
  'twineedle',
  'volt-tackle',
  'water-pulse',
  'waterfall',
  'zen-headbutt',
  'zap-cannon',
];

const ABILITY_MOVE_BOOST_RULES: Record<string, AbilityMoveBoostRule> = {
  'iron-fist': { match: { kind: 'flag', flag: 'punch' }, multiplier: 1.2 },
  'strong-jaw': { match: { kind: 'flag', flag: 'bite' }, multiplier: 1.5 },
  'mega-launcher': { match: { kind: 'flag', flag: 'pulse' }, multiplier: 1.5 },
  'tough-claws': { match: { kind: 'flag', flag: 'contact' }, multiplier: 1.3 },

  'steely-spirit': { match: { kind: 'effective-type', type: 'steel' }, multiplier: 1.5 },
  transistor: { match: { kind: 'effective-type', type: 'electric' }, multiplier: 1.3 },
  "dragon's-maw": { match: { kind: 'effective-type', type: 'dragon' }, multiplier: 1.5 },

  pixilate: { match: { kind: 'retype-conversion' }, multiplier: 1.2 },
  aerilate: { match: { kind: 'retype-conversion' }, multiplier: 1.2 },
  refrigerate: { match: { kind: 'retype-conversion' }, multiplier: 1.2 },
  galvanize: { match: { kind: 'retype-conversion' }, multiplier: 1.2 },
  normalize: { match: { kind: 'retype-conversion' }, multiplier: 1.2 },

  technician: { match: { kind: 'power-threshold', maxPower: 60 }, multiplier: 1.5 },

  'sheer-force': { match: { kind: 'move-list', moves: SHEER_FORCE_MOVES }, multiplier: 1.3 },
};

function toSlug(ability: string): string {
  return ability.toLowerCase().trim().replace(/\s+/g, '-');
}

/**
 * The power multiplier the Pokemon's equipped ability applies to the given
 * equipped move, or null if the ability doesn't affect this move at all
 * (including when the ability has no boost rule, or the move's `flags`/
 * `type`/`power`/`name` don't match the rule it does have).
 */
export function getAbilityMoveBoostMultiplier(
  ability: string | undefined,
  move: MoveData,
): number | null {
  if (!ability) return null;
  const rule = ABILITY_MOVE_BOOST_RULES[toSlug(ability)];
  if (!rule) return null;

  const { match } = rule;
  switch (match.kind) {
    case 'flag':
      return move.flags.includes(match.flag) ? rule.multiplier : null;
    case 'effective-type':
      return getEffectiveMoveType(move.name, move.type, ability) === match.type
        ? rule.multiplier
        : null;
    case 'retype-conversion': {
      // Normalize boosts every move unconditionally, converted or not - see file header.
      if (toSlug(ability) === 'normalize') return rule.multiplier;
      const effectiveType = getEffectiveMoveType(move.name, move.type, ability);
      return effectiveType !== move.type ? rule.multiplier : null;
    }
    case 'power-threshold':
      return move.power !== null && move.power <= match.maxPower ? rule.multiplier : null;
    case 'move-list':
      return match.moves.includes(move.name) ? rule.multiplier : null;
  }
}
