/**
 * Champions Ability Damage-Math Overrides
 * Sibling to championsAbilityOverrides.ts, which its own header scopes to
 * display-text-only - this file is the other half: abilities whose
 * Champions balance patch actually changes the damage `@smogon/calc`
 * computes, not just the description shown for them. `@smogon/calc` only
 * knows mainline Scarlet/Violet ability mechanics, so it has no idea either
 * of these two abilities behaves differently on Champions.
 *
 * - 'unseen-fist': mainline lets Unseen Fist's contact moves hit through
 *   Protect at full damage (confirmed live in `@smogon/calc`'s own bundled
 *   `gen789.js` - `attacker.hasAbility('Unseen Fist') && move.flags.contact`
 *   already lets the move through). Champions nerfs the damage dealt
 *   through Protect to 25% - the pass-through itself doesn't need
 *   correcting, only the multiplier applied once it's through.
 * - 'aura-guard': a Champions-invented ability (Mega Lucario Z) with no
 *   mainline equivalent at all - halves damage taken from contact moves.
 *   Same shape as `@smogon/calc`'s own bundled Fluffy handling in
 *   `gen789.js`, just for an ability the bundled Gen 9 data has no idea
 *   exists.
 *
 * Applied in damageCalcEngine.ts::computeSideResults, after calculate()
 * returns and after the existing isFullyBlocked check - an immunity/full
 * Protect block still short-circuits first, unchanged. Both multipliers are
 * independent and compose multiplicatively if a matchup ever triggered both
 * at once (not a real matchup today).
 *
 * See TODO.md's [Calc Auto Ability-Effect Application] entry for the design
 * this implements.
 */

export interface ChampionsAbilityDamageEffect {
  /** Scales damage a contact move deals when it hits through Protect (Unseen Fist). */
  throughProtectMultiplier?: number;
  /** Scales damage taken from a contact move (Aura Guard). */
  contactDamageTakenMultiplier?: number;
}

const CHAMPIONS_ABILITY_DAMAGE_EFFECTS: Record<string, ChampionsAbilityDamageEffect> = {
  'unseen-fist': { throughProtectMultiplier: 0.25 },
  'aura-guard': { contactDamageTakenMultiplier: 0.5 },
};

export function getChampionsAbilityDamageEffect(abilitySlug: string): ChampionsAbilityDamageEffect | undefined {
  return CHAMPIONS_ABILITY_DAMAGE_EFFECTS[abilitySlug];
}
