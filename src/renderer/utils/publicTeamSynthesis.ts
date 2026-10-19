/**
 * publicTeamSynthesis.ts - Client-Side Optimistic PublicTeam Synthesis
 * Profile Section Remove-Team Control, Leg 6 fold-in (see TODO.md):
 * ProfileCard.tsx renders Open/Closed sections from usePublicProfile's
 * one-shot `GET /profile/:username` fetch, which never refreshes
 * mid-session. Adding a team that's never been public before has no
 * existing `PublicTeam` representation in that fetched data at all (unlike
 * a visibility-tier switch or a cross-section drag, both of which reuse a
 * team object already in hand), so there's nothing for ProfileCard to
 * display until a page reload. This synthesizes one locally, from the same
 * local `Team` the "+ Team" picker already has, so the card can appear
 * immediately.
 *
 * Mirrors worker/src/publicProfile.ts's `extractPublicTeam`/
 * `extractPublicPokemon` shape - same duplication-across-the-boundary
 * tradeoff as utils/spriteUrl.ts's `getPixelSpriteUrl` vs. the Worker's own
 * hand-duplicated copy (see stored-snapshot-vs-live-recompute.md). Deliberately
 * skips the Worker's safety-filter check on name/nickname: this is a
 * same-owner optimistic local preview, never sent anywhere - the real
 * public record is still whatever the Worker computes (and filters) once
 * sync actually lands, so a flagged name would still be excluded there even
 * if it briefly renders here.
 */

import type { Team, ImportedPokemonInfo } from '../types/pokemon';
import type { PublicTeam } from '../services/syncApi';
import { getPixelSpriteUrl } from './spriteUrl';

function synthesizePublicPokemon(
  pokemon: ImportedPokemonInfo,
  includeSetData: boolean,
): PublicTeam['pokemon'][number] {
  const sd = pokemon.showdownData;
  const spriteUrl = getPixelSpriteUrl(pokemon.pokedexNumber, sd.species, sd.gender || '', sd.shiny);

  if (!includeSetData) {
    return { species: sd.species, nickname: sd.nickname, spriteUrl };
  }

  return {
    species: sd.species,
    nickname: sd.nickname,
    spriteUrl,
    item: sd.item,
    ability: sd.ability,
    level: sd.level,
    shiny: sd.shiny,
    gigantamax: sd.gigantamax,
    happiness: sd.happiness,
    teraType: sd.teraType,
    nature: sd.nature,
    evs: sd.evs,
    moves: sd.moves,
    gender: sd.gender,
  };
}

/** Builds the public-safe view a just-added `team` would get back from the
 * Worker, for immediate display at `tier` ('private' never reaches this -
 * the "+ Team" picker only ever adds to 'open'/'closed'). */
export function synthesizePublicTeam(team: Team, tier: 'open' | 'closed'): PublicTeam {
  return {
    id: team.id,
    name: team.name,
    format: team.format,
    visibility: tier,
    pokemon: team.pokemon.map((p) => synthesizePublicPokemon(p, tier === 'open')),
  };
}
