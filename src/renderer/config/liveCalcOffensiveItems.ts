/**
 * Live Calc Damage-Relevant Offensive Items
 * Curated subset of the real Champions item pool (`config/vgcData.ts`'s
 * `VGC_HOLD_ITEMS`) restricted to items that change damage a Pokémon DEALS -
 * the mirror of `config/liveCalcDefensiveItems.ts`'s "damage taken" list,
 * added for Live Calc Feedback Pass 2, Leg 2 (see that file's own header for
 * the shared-candidate-pool design this fixes: `utils/liveCalcEngine.ts`'s
 * `itemCandidates` axis is the SAME held item scanned from both the
 * defender-taking-damage direction and the opponent-dealing-damage
 * direction, since it's the one real Pokémon holding one real item across
 * the whole battle - but until this file existed, the candidate pool was
 * seeded from the defensive list alone, so a real offense-boosting item
 * (Life Orb, a type-boost item, etc.) could never appear as a feasible
 * candidate for the "their move -> you" narrowing direction at all. That
 * silently rejected any reverse observation whose damage% could only be
 * explained by such an item, surfacing as a false "doesn't fit any SP value"
 * contradiction even when a real Attack/Sp. Atk value obviously existed.
 *
 * Contents: the 18 type-boosting items (one per type, `@smogon/calc`'s own
 * bundled item data already models the matching-type-only 1.2x boost, same
 * as how the defensive berries' resisted-type activation is already
 * trusted), plus Life Orb (flat 1.3x all moves), Expert Belt (1.2x on a
 * super-effective hit only), Muscle Band (1.1x physical moves only), Wise
 * Glasses (1.1x special moves only), and Light Ball (Pikachu-exclusive 2x
 * Atk/SpA - a no-op candidate for every other species, same as how a
 * type-resist berry is a no-op for a non-matching-type hit). Verified present
 * in `VGC_HOLD_ITEMS` (itself sourced from Serebii's Champions items page per
 * that file's header).
 *
 * Deliberately excluded - all for the same reason `liveCalcDefensiveItems.ts`
 * excludes HP-threshold berries (they change something other than THIS hit's
 * damage%, or need state this engine doesn't track):
 * - Metronome: power scales with consecutive uses of the same move - no
 *   per-move-streak state exists here (same "not modeled" class as multi-hit
 *   moves, see `liveCalcEngine.ts`'s own header).
 * - Normal Gem: one-shot +30% on the next Normal move, then consumed -
 *   modeling it as a persistent candidate would wrongly apply the boost to
 *   every observation, not just one.
 * - Binding Band: doubles a binding move's END-OF-TURN drain (Wrap, Sand
 *   Tomb, etc.), not the initial hit's own `calculate()`-computed damage -
 *   irrelevant to what this engine models (single-hit move damage%).
 * - Leek / Scope Lens: raise crit STAGE (chance of a crit), not a crit's
 *   damage magnitude - crit is already an explicit per-observation input
 *   (`LiveCalcObservation.isCrit`), so these items would only ever affect
 *   which observations occur, not how this file should score one that did.
 */

export const LIVE_CALC_OFFENSIVE_ITEMS: string[] = [
  'Silk Scarf', // Normal
  'Charcoal', // Fire
  'Mystic Water', // Water
  'Magnet', // Electric
  'Miracle Seed', // Grass
  'Never-Melt Ice', // Ice
  'Black Belt', // Fighting
  'Poison Barb', // Poison
  'Soft Sand', // Ground
  'Sharp Beak', // Flying
  'Twisted Spoon', // Psychic
  'Silver Powder', // Bug
  'Hard Stone', // Rock
  'Spell Tag', // Ghost
  'Dragon Fang', // Dragon
  'Black Glasses', // Dark
  'Metal Coat', // Steel
  'Fairy Feather', // Fairy
  'Life Orb',
  'Expert Belt',
  'Muscle Band',
  'Wise Glasses',
  'Light Ball',
];
