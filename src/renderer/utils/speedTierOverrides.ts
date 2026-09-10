/**
 * speedTierOverrides.ts - Team Preview Strip Scratch-State Data Layer
 * Speed Tiers Team Preview Strip (Leg 5, see TODO.md /
 * docs/investigations/speed-tiers-preview-strip-scope.md). Pure functions
 * turning a per-mon session-only override (Speed SP, nature, form/species)
 * into the effective ImportedPokemonInfo utils/speedTiers.ts::computeTeamSpeed
 * actually consumes - none of these three write back to the real team data
 * (see the scoping doc's "session-only"/"local preview only" resolutions;
 * a "save this edit to the team" action is a separate, unscheduled follow-up
 * in TODO.md, not built here).
 *
 * Ability is deliberately NOT part of the override shape - it's derived from
 * `species` instead (config/megaAbilities.ts::getMegaAbility), same as
 * CalcPokemonPanel.tsx's own Mega toggle: Mega Evolving always forces one
 * fixed ability, so there's no independent choice to track, and every other
 * forme (stat-formes, base) just keeps the pokemon's real ability. This
 * matters for the Speed number itself, not just flavor - several Champions
 * Mega abilities are weather/terrain speed-doublers (e.g. Electric Surge,
 * Swift Swim via a Drizzle-adjacent forme - see megaAbilities.ts), so getting
 * the toggled ability right is load-bearing for what this page plots.
 *
 * Sprite swapping on a form toggle was originally cut from this leg's scope
 * (Speed number reacting to a toggle, not the icon) - added later as part of
 * TODO.md's Speed Tiers Mega Sprite Fallback follow-up, once that leg's fix
 * made a real cached Mega sprite reliably available each session. `pokemon`
 * itself is left untouched here (species/ability/nature/SP only, as below) -
 * TeamPreviewCard.tsx resolves its own displayed sprite straight from
 * `override.species` via useMegaSprite.ts's resolveDisplaySpriteUrl, and
 * utils/speedTiers.ts::computeTeamSpeed does the same for the tier list's own
 * "You" tile, both reading the override-applied `showdownData.species` this
 * function already produces rather than needing a fourth override field.
 */
import type { NatureName } from '@smogon/calc/dist/data/interface';
import type { ImportedPokemonInfo } from '../types/pokemon';
import { getMegaAbility } from '../config/megaAbilities';

/**
 * Session-only override for one team member's Speed Tiers preview - see
 * this file's header. `spSpeed` is Champions' own 0-32 Stat Point scale,
 * same as ShowdownPokemon.evs.speed (see utils/championsStats.ts).
 */
export interface TeamSpeedOverride {
  spSpeed: number;
  nature: NatureName;
  species: string;
}

/** The override that reproduces the pokemon's own real, saved values - what
 * every card starts at before the user touches anything. */
export function defaultSpeedOverride(pokemon: ImportedPokemonInfo): TeamSpeedOverride {
  return {
    spSpeed: pokemon.showdownData.evs.speed,
    nature: (pokemon.showdownData.nature || 'Hardy') as NatureName,
    species: pokemon.showdownData.species,
  };
}

/**
 * Returns a shallow-overridden copy of `pokemon` with the override's
 * species/nature/Speed-SP folded into `showdownData`, ready to feed into
 * computeTeamSpeed. `pokemon` is returned unchanged when there's no override
 * yet - the common case, since most of a team's 6 mons stay untouched in any
 * one session.
 */
export function applySpeedOverride(pokemon: ImportedPokemonInfo, override: TeamSpeedOverride | undefined): ImportedPokemonInfo {
  if (!override) return pokemon;
  const megaAbility = getMegaAbility(override.species.toLowerCase());
  return {
    ...pokemon,
    showdownData: {
      ...pokemon.showdownData,
      species: override.species,
      ability: megaAbility ?? pokemon.showdownData.ability,
      nature: override.nature,
      evs: { ...pokemon.showdownData.evs, speed: override.spSpeed },
    },
  };
}
