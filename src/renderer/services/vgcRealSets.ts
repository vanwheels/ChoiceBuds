/**
 * Per-species real-set extraction pipeline (VGCPastes Per-Species Real-Set
 * Extraction, see TODO.md and docs/investigations/
 * vgcpastes-realset-extraction-scope.md for the scoping session). Given a
 * regulation's already-cached VgcPasteTeamRow[] (useVgcPastesCache.ts - no
 * new fetch needed to get the row list itself) and a target species, filters
 * to the rows that mention it, fetches+parses only those pastes, and dedupes
 * the resulting move/item/ability/nature/EV bundles into an occurrence count.
 *
 * Species matching reuses `normalizeUsageCacheKey()`
 * (services/championsBattleData.ts) directly against the sheet's own
 * Showdown-format species text (VgcPasteTeamRow.species) - the scoping
 * session confirmed no new normalization is needed, since that section of
 * the sheet is copy-pasted straight out of Showdown exports already.
 *
 * The fetch loop is deliberately sequential (a plain `for...of` with
 * `await`, never `Promise.all`) - CLAUDE.md's eighth exception requires
 * politeness for any bulk sheet-driven pokepaste fetching, and a regulation
 * tab can hold 200+ rows.
 */

import { parseShowdownText } from './parser';
import { fetchPokepaste, extractPokepasteId } from './pokepaste';
import { normalizeUsageCacheKey } from './championsBattleData';
import { getMegaApiSlug } from '../config/megaEvolution';
import type { ShowdownPokemon, VgcPasteTeamRow, VgcRealSetBundle, VgcRealSetsEntry } from '../types/pokemon';

/** True when one of a row's own species tokens matches `targetSpecies` (key-normalized on both sides). */
export function matchesSpecies(rowSpecies: string[], targetSpecies: string): boolean {
  const targetKey = normalizeUsageCacheKey(targetSpecies);
  return rowSpecies.some(species => normalizeUsageCacheKey(species) === targetKey);
}

/** Narrows a regulation's cached rows to only the ones that mention `targetSpecies`. */
export function filterRowsBySpecies(rows: VgcPasteTeamRow[], targetSpecies: string): VgcPasteTeamRow[] {
  return rows.filter(row => matchesSpecies(row.species, targetSpecies));
}

/** Builds a single-occurrence bundle from one parsed Pokemon - see mergeRealSetBundles for how duplicates collapse. */
export function toRealSetBundle(pokemon: ShowdownPokemon): VgcRealSetBundle {
  return {
    item: pokemon.item,
    ability: pokemon.ability,
    nature: pokemon.nature,
    moves: [...pokemon.moves].sort(),
    evs: pokemon.evs,
    occurrences: 1,
  };
}

/** Case-insensitive equality key for dedupe - moves are already sorted by toRealSetBundle. */
function bundleDedupeKey(bundle: VgcRealSetBundle): string {
  return JSON.stringify({
    item: bundle.item?.toLowerCase() ?? null,
    ability: bundle.ability?.toLowerCase() ?? null,
    nature: bundle.nature?.toLowerCase() ?? null,
    moves: bundle.moves.map(move => move.toLowerCase()),
    evs: bundle.evs,
  });
}

/**
 * Collapses a list of one-occurrence bundles (one per sampled paste) into
 * distinct bundles with a summed occurrence count, most-seen first.
 */
export function mergeRealSetBundles(bundles: VgcRealSetBundle[]): VgcRealSetBundle[] {
  const merged = new Map<string, VgcRealSetBundle>();
  for (const bundle of bundles) {
    const key = bundleDedupeKey(bundle);
    const existing = merged.get(key);
    if (existing) {
      existing.occurrences += bundle.occurrences;
    } else {
      merged.set(key, { ...bundle });
    }
  }
  return [...merged.values()].sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Fetches+parses only `matchingRows` (already filtered by filterRowsBySpecies)
 * and returns the deduped result. A row whose pokepasteUrl doesn't parse as a
 * pokepast.es link, whose fetch fails, or whose paste's Showdown text doesn't
 * actually contain `species` (a sheet species-text mismatch) is skipped
 * rather than failing the whole extraction - one bad source row shouldn't
 * block every other sampled team.
 */
export async function extractRealSetsForSpecies(
  species: string,
  matchingRows: VgcPasteTeamRow[]
): Promise<VgcRealSetsEntry> {
  const targetKey = normalizeUsageCacheKey(species);
  const rawBundles: VgcRealSetBundle[] = [];
  let sampledTeamCount = 0;

  for (const row of matchingRows) {
    const pasteId = extractPokepasteId(row.pokepasteUrl);
    if (!pasteId) continue;

    try {
      const paste = await fetchPokepaste(pasteId);
      // parseShowdownText normalizes a Mega-Evolved member's species back to
      // its base form the same way Team Builder import does (see
      // normalizeMegaSpeciesOnImport) - reconstruct the Mega-suffixed slug
      // from the held item before comparing, or a Mega `targetKey` (matched
      // against the sheet's own un-parsed, still-Mega-suffixed species list
      // in filterRowsBySpecies above) would never match anything parsed out
      // of the fetched paste text itself.
      const { pokemon } = parseShowdownText(paste.paste);
      const match = pokemon.find(p => normalizeUsageCacheKey(getMegaApiSlug(p.item, p.species) ?? p.species) === targetKey);
      if (!match) continue;

      sampledTeamCount++;
      rawBundles.push(toRealSetBundle(match));
    } catch (err) {
      console.error(`Real-set extraction: failed to fetch/parse pokepaste for row "${row.id}":`, err);
    }
  }

  return {
    species: targetKey,
    sampledTeamCount,
    bundles: mergeRealSetBundles(rawBundles),
    fetchedAt: Date.now(),
  };
}
