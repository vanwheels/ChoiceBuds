/**
 * Pure display-formatting helpers for VgcPasteCatalogRow.tsx (VGCPastes
 * Sample Team Catalog: Row Display Rework Leg 2, see TODO.md) - split out of
 * the component so this logic is unit-testable on its own, same rationale as
 * services/parser.ts's pure functions.
 *
 * Sprite matching (findRosterEntry/resolveCatalogSpriteEntry) needed more
 * than one lookup tier once live-verified against a real sheet pull:
 * checking the VGCPastes Reg M-C tab's 119 unique species strings against
 * the roster found only 75 direct matches. The other 44 split into two real
 * causes, both already solved elsewhere in this app for the normal
 * import/enrichment path, just never reused here:
 *   1. Mega forms (35 of the 44) - useSpeciesRoster.ts deliberately excludes
 *      every "-mega" PokeAPI resource from the roster (Mega Evolution is
 *      item-driven in this app's own team builder, not a roster pick), but
 *      the sheet's species text already spells Mega forms out directly
 *      ("Absol-Mega-Z"), so the fix is to detect that shape and pull the
 *      sprite from the same Mega-sprite cache TeamCard.tsx's mini strip
 *      already warms (hooks/useMegaSprite.ts), not from the roster at all.
 *   2. Species with no bare-named PokeAPI resource (6 of the 44 - Aegislash,
 *      Basculegion, Basculegion-F, Indeedee, Indeedee-F, Mimikyu) - PokeAPI
 *      only exposes these by their specific forme/gender slug
 *      ("aegislash-shield", "basculegion-male"), which
 *      services/pokeapi.ts's normalizeSpeciesForAPI already maps Showdown's
 *      bare species names to for the real import path - reused here as a
 *      second lookup key rather than re-deriving the same mapping.
 * Confirmed live 2026-09-14 (see docs/investigations/
 * vgcpastes-catalog-sprite-matching.md) - reduces the 44 unmatched to 3
 * genuinely rare residual gaps (a sheet-only "Maushold-Four" spelling that
 * doesn't match normalizeSpeciesForAPI's "maushold" key, a combined
 * Mega+gender-divergent "Meowstic-F-Mega", and "Toxtricity" - the last one
 * is actually a normalizeSpeciesForAPI gap, not a catalog-only issue; see
 * TODO.md's "Toxtricity Import Enrichment 404" entry rather than patching it
 * here). Those 3 fall through to an empty sprite slot, same as any other
 * miss.
 */

import type { EVSpread, SpeciesRosterEntry } from '../types/pokemon';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { CURATED_MEGA_FORM_SLUGS } from '../config/megaEvolution';
import { getCachedMegaSprite, type MegaSpriteResult } from '../hooks/useMegaSprite';

const EV_LABELS: Array<[keyof EVSpread, string]> = [
  ['hp', 'HP'],
  ['attack', 'Atk'],
  ['defense', 'Def'],
  ['specialAttack', 'SpA'],
  ['specialDefense', 'SpD'],
  ['speed', 'Spe'],
];

/** Formats an EV spread as "252 HP / 4 Def / 252 Spe", or "No EVs" if all zero. */
export function formatEvs(evs: EVSpread): string {
  const parts = EV_LABELS.filter(([key]) => evs[key] > 0).map(([key, label]) => `${evs[key]} ${label}`);
  return parts.length > 0 ? parts.join(' / ') : 'No EVs';
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Matches a VGCPastes sheet species-name string against the full roster by
 * normalized name (lowercased, non-alphanumeric stripped) - the sheet's text
 * doesn't always match this app's own display-name spelling exactly (e.g.
 * spacing/hyphen differences on multi-word forms). Returns undefined on no
 * match rather than throwing; callers render an empty slot in that case.
 */
export function findRosterEntry(speciesName: string, roster: SpeciesRosterEntry[]): SpeciesRosterEntry | undefined {
  const target = normalizeForMatch(speciesName);
  return roster.find(entry => normalizeForMatch(entry.name) === target);
}

const MEGA_TEXT_SUFFIX_PATTERN = /-mega(-[a-z])?$/i;

// Reg M-C's Floette is legal only as Floette-Eternal (see
// utils/pokemonRules.ts), so a Mega'd Floette's sheet text can read either
// "Floette-Mega" or "Floette-Eternal-Mega" - config/megaEvolution.ts's
// CURATED_MEGA_FORM_SLUGS only carries the "floette-mega" slug (the one
// @smogon/calc's own dex actually uses, per that file's header comment), so
// both text shapes need to resolve to it.
const MEGA_SLUG_TEXT_OVERRIDES: Record<string, string> = {
  'floette-eternal-mega': 'floette-mega',
};

/**
 * Builds the PokeAPI Mega-form slug ("absol-mega-z") a sheet species string
 * refers to, or null if it's not a "-Mega"/"-Mega-X/Y/Z"-suffixed string, or
 * it is but doesn't resolve to a slug this app's own curated Champions Mega
 * list recognizes (config/megaEvolution.ts) - a real Mega form that just
 * isn't legal here isn't worth guessing a sprite for.
 */
function buildMegaSlugFromText(speciesText: string): string | null {
  const lower = speciesText.toLowerCase().trim();
  if (!MEGA_TEXT_SUFFIX_PATTERN.test(lower)) return null;
  const slug = MEGA_SLUG_TEXT_OVERRIDES[lower] ?? lower;
  return CURATED_MEGA_FORM_SLUGS.has(slug) ? slug : null;
}

/** Sprite pair shape shared by both a roster entry and a cached Mega-sprite lookup. */
export interface CatalogSpriteEntry {
  spriteUrl: string;
  shinySpriteUrl: string;
}

/**
 * Resolves a sheet species-name string to a sprite, trying three tiers in
 * order (see this file's header for why each one exists):
 *   1. Direct roster match.
 *   2. The same PokeAPI-slug normalization the real import/enrichment path
 *      uses (services/pokeapi.ts's normalizeSpeciesForAPI), matched back
 *      against the roster - covers gender-divergent species and species
 *      with no bare-named PokeAPI resource.
 *   3. A Mega-form slug read from the already-warmed Mega-sprite cache
 *      (hooks/useMegaSprite.ts) - callers must have mounted
 *      useMegaSpritePrefetch() first (same as TeamCard.tsx's mini sprite
 *      strip) or this tier is always a miss.
 * Returns null (render an empty slot) when none of the three resolve.
 */
export function resolveCatalogSpriteEntry(speciesText: string, roster: SpeciesRosterEntry[]): CatalogSpriteEntry | MegaSpriteResult | null {
  const direct = findRosterEntry(speciesText, roster);
  if (direct) return direct;

  const apiSlug = normalizeSpeciesForAPI(speciesText);
  const viaApiSlug = findRosterEntry(apiSlug, roster);
  if (viaApiSlug) return viaApiSlug;

  const megaSlug = buildMegaSlugFromText(speciesText);
  if (megaSlug) {
    const megaSprite = getCachedMegaSprite(megaSlug);
    if (megaSprite) return megaSprite;
  }

  return null;
}
