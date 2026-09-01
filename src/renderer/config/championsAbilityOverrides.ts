/**
 * Champions Ability Balance Overrides
 * Same rationale as championsMoveOverrides.ts - PokeAPI models mainline
 * Scarlet/Violet only. `healer`/`unseen-fist` were originally verified
 * against Bulbapedia's Champions article ("Changes from Scarlet and Violet
 * and Generation VIII"):
 *   https://bulbapedia.bulbagarden.net/wiki/Pokémon_Champions
 *
 * Re-audited 2026-09-01 against Showdown's `champions` mod
 * (`data/mods/champions/abilities.ts`, per CLAUDE.md's sixth Showdown-mod
 * exception - ladder-verified, not just a wiki summary) - it lists 13
 * ability overrides total. `healer` and `unseen-fist` both match exactly:
 * healer's onResidual is a flat 50% (`randomChance(1, 2)`) and unseen-fist's
 * shortDesc confirms the 1/4-damage-through-Protect text below.
 *
 * The other 11 don't need entries here:
 * - `angershell`/`berserk`/`disguise`/`naturalcure`/`regenerator` only
 *   change internal engine behavior (multi-hit-move edge cases, an
 *   info-leak fix for Natural Cure's Team Preview signal, Mimikyu/
 *   Disguise's substitute interaction) - none of it changes the ability's
 *   user-facing description text vs. mainline, so there's nothing to
 *   override.
 * - `dragonize`/`eelevate`/`firemane`/`megasol`/`piercingdrill`/
 *   `spicyspray` are Future-flagged abilities Champions un-bans
 *   (`isNonstandard: null`) that have no PokeAPI resource at all (PokeAPI
 *   only models released mainline games), so `applyChampionsAbilityOverride`
 *   below - which only ever runs on ability data PokeAPI actually returned -
 *   can't reach them anyway. They're the fixed post-Mega abilities for
 *   Eelektross/Feraligatr/Meganium/Excadrill/Pyroar/Scovillain instead,
 *   handled as plain name strings by `config/megaAbilities.ts`. See
 *   `docs/investigations/champions-showdown-mod-audit.md` for the full
 *   pass.
 *
 * Known limitation: these only correct the description text shown in our
 * own tooltips. If @smogon/calc has its own internal Unseen Fist-vs-Protect
 * damage logic, that deep interaction may still assume the old 100% value -
 * not chased further here, see TODO.md.
 */

import type { AbilityData } from '../types/pokemon';
import { normalizeNameForAPI } from '../services/pokeapiService';

const CHAMPIONS_ABILITY_OVERRIDES: Record<string, Partial<AbilityData>> = {
  'healer': { description: 'Has a 50% chance to heal an adjacent ally of its status condition each turn.' },
  'unseen-fist': { description: "Contact moves can hit through Protect and similar moves, but deal only 25% damage when they do." },
};

export function applyChampionsAbilityOverride(ability: AbilityData): AbilityData {
  const slug = normalizeNameForAPI(ability.name);
  const override = CHAMPIONS_ABILITY_OVERRIDES[slug];
  return override ? { ...ability, ...override } : ability;
}
