/**
 * Live Calc Damage-Relevant Defensive Items
 * Curated subset of the real Champions item pool (`config/vgcData.ts`'s
 * `VGC_ITEMS`) restricted to items that actually change damage a Pokémon
 * TAKES - most of the ~140-item Champions pool doesn't (type-boosting items
 * like Charcoal/Black Glasses, Choice items, status-cure berries, etc. all
 * affect the ATTACKER's output or something unrelated to incoming damage).
 *
 * Notably, mainline VGC's usual defensive staples don't exist in this pool at
 * all - `vgcData.ts`'s own header confirms Champions has no Assault Vest, no
 * Eviolite, no Safety Goggles. That leaves exactly the 18 type-resist berries
 * (one per type, each halving damage from a super-effective hit of its type -
 * standard Gen mechanic, `@smogon/calc`'s own bundled item data already
 * models the activation condition correctly, same as every other item the
 * existing Damage Calc tab passes through) as the only real candidates -
 * verified against `VGC_BERRIES` in `vgcData.ts`, which is itself sourced
 * from Serebii's Champions items page per that file's header. Status/HP
 * berries (Sitrus, Lum, Cheri, etc.) are excluded: they trigger after the
 * hit that drops HP past their threshold, so they don't change the damage%
 * of the hit itself - not relevant to what Live Calc infers from.
 *
 * Used by `utils/liveCalcEngine.ts` as the candidate item pool for narrowing
 * a Live Calc defender's unknown held item - alongside an implicit "no item"
 * option the engine adds itself, since not holding a damage-relevant item is
 * always a live possibility too.
 */

export const LIVE_CALC_DEFENSIVE_ITEMS: string[] = [
  'Babiri Berry', // Steel
  'Charti Berry', // Rock
  'Chilan Berry', // Normal
  'Chople Berry', // Fighting
  'Coba Berry', // Flying
  'Colbur Berry', // Dark
  'Haban Berry', // Dragon
  'Kasib Berry', // Ghost
  'Kebia Berry', // Poison
  'Occa Berry', // Fire
  'Passho Berry', // Water
  'Payapa Berry', // Psychic
  'Rindo Berry', // Grass
  'Roseli Berry', // Fairy
  'Shuca Berry', // Ground
  'Tanga Berry', // Bug
  'Wacan Berry', // Electric
  'Yache Berry', // Ice
];
