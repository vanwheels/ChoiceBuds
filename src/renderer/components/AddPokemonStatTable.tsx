/**
 * AddPokemonStatTable.tsx - Sortable Base-Stat Table for Adding a Pokémon
 * (Add Pokémon: Sortable Base-Stat Table Leg 1, see TODO.md)
 *
 * Replaces SpeciesPickerCard.tsx at TeamCard.tsx's trailing "+ Add Pokémon"
 * slot only - SpeciesPickerCard itself is unchanged and keeps serving
 * PokemonCard.tsx's Roster Swap picker. Renders as a modal/overlay (Modal.tsx)
 * rather than in-slot: a 8-column stat table (sprite+name, HP/Atk/Def/SpA/
 * SpD/Spe, BST) doesn't fit SpeciesPickerCard's 280px card width.
 *
 * Search supports the same '#tag' type/move/ability chain SpeciesPickerCard
 * does (e.g. '#fire #drought #tailwind', ANDed together) - ported over
 * as-is (see that file's header comment for the full type -> move -> ability
 * fallback/resolution writeup) rather than reimplemented, since dropping it
 * when this component replaced SpeciesPickerCard at this call site was a
 * real regression, not an intentional cut.
 *
 * Column headers sort the whole table (Showdown Random Battle Dex-style) -
 * see utils/statTable.ts for the actual sort/BST math, kept pure and
 * unit-tested there rather than inlined here.
 *
 * Base stats are joined from the PokeAPI cache at render time
 * (`getCachedEntry`, keyed the same way useInitialSync.ts's bulk sync writes
 * it - normalizeSpeciesForAPI(species.name)) rather than stored on
 * SpeciesRosterEntry itself - the full legal roster is already cached by
 * first launch, so this is a join, not a new fetch. A roster entry with no
 * cache hit yet (shouldn't happen post-sync, but not guaranteed) still shows
 * up in the table with dashes for its stats instead of being dropped.
 *
 * Mega forms get their own sortable rows (Add Pokémon Table: Mega Form Rows
 * Leg 2, see TODO.md and docs/investigations/mega-form-rows-scoping.md) - one
 * per Mega Stone entry in config/megaEvolution.ts's MEGA_STONE_TO_SPECIES,
 * gated to species already present in the `roster` prop (so a Mega row never
 * outlives its base species' own legality/dedupe rules - `roster` here is
 * already regulation- and already-on-team-filtered by TeamCard.tsx). Base
 * stats/types come from @smogon/calc's bundled dex (`gen.species.get`), the
 * same source SpeedTiersPage.tsx already reads for Mega forms - no PokeAPI
 * resource exists for most of them. Selecting a Mega row adds the *base*
 * species holding that stone, with the stone itself pre-equipped as its held
 * item (`onSelect`'s optional `itemOverride` arg, threaded through
 * useRosterActions.ts's `buildSlot`/`addSlot`) - everything else (ability/
 * moves) still comes from the normal usage-based default. Mega rows are
 * excluded from `#tag` search for now (Leg 3, see TODO.md); plain-text
 * search still matches them by their "Mega {Species}" label.
 *
 * `savedPokemon`/`onSelectSaved` (From Box) mirrors SpeciesPickerCard's own
 * opt-in pair exactly - same filtering rules, same omitted-means-no-section
 * behavior - so TeamCard.tsx's existing "From Box" support carries over
 * unchanged.
 *
 * Also wired into BoxPage.tsx's own "+ New Build" flow (Leg 2, see
 * TODO.md), replacing SpeciesPickerCard there the same way it replaced it on
 * TeamCard.tsx. BoxPage omits `savedPokemon`/`onSelectSaved` - same reasoning
 * SpeciesPickerCard's header comment used to give for why Box's "+ New
 * Build" never passed them: picking a Box entry from inside Box's own
 * creation flow would be circular.
 */

import { useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import type { PokeAPICacheEntry, PokemonStats, SavedPokemonEntry, SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getStatLabelColor } from '../config/pokemonTheme';
import { computeBST, nextStatTableSort, sortStatTableRows } from '../utils/statTable';
import type { StatTableSort, StatTableSortKey } from '../utils/statTable';
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter';
import { usePokemonMoveFilter, isMoveResolved } from '../hooks/usePokemonMoveFilter';
import { usePokemonAbilityFilter } from '../hooks/usePokemonAbilityFilter';
import { parseTagFilters } from '../utils/tagSearch';
import { ALL_TYPES } from '../config/typeEffectiveness';
import { MEGA_STONE_TO_SPECIES, formatMegaLabel } from '../config/megaEvolution';
import { getCachedMegaSprite, useMegaSpritePrefetch } from '../hooks/useMegaSprite';
import { toTitleCase } from '../utils/displayName';
import Modal from './Modal';

// Same Gen 9 dex SpeedTiersPage.tsx reads Mega base stats/types from - see
// this file's header comment.
const GEN_NUM = 9;

interface AddPokemonStatTableProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;
  onSelect: (species: SpeciesRosterEntry, itemOverride?: string) => void;
  onClose: () => void;
  savedPokemon?: SavedPokemonEntry[];
  onSelectSaved?: (entry: SavedPokemonEntry) => void;
}

/**
 * A generic row shape shared by both a plain roster species and a synthetic
 * Mega-form row - the table only needs a label/sprite/stats/click-handler to
 * render and sort, not the underlying species data itself (which differs:
 * `SpeciesRosterEntry` for a plain row, MEGA_STONE_TO_SPECIES's base
 * species + stone item name for a Mega row - see this file's header).
 */
interface StatTableRow {
  key: string;
  displayName: string;
  spriteUrl: string;
  hp: number | null;
  attack: number | null;
  defense: number | null;
  specialAttack: number | null;
  specialDefense: number | null;
  speed: number | null;
  bst: number | null;
  onClick: () => void;
}

const STAT_COLUMNS: Array<{ key: StatTableSortKey; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Atk' },
  { key: 'defense', label: 'Def' },
  { key: 'specialAttack', label: 'SpA' },
  { key: 'specialDefense', label: 'SpD' },
  { key: 'speed', label: 'Spe' },
  { key: 'bst', label: 'BST' },
];

export default function AddPokemonStatTable({
  roster,
  rulesetId,
  resolveSprite,
  getCachedEntry,
  onSelect,
  onClose,
  savedPokemon,
  onSelectSaved,
}: AddPokemonStatTableProps) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StatTableSort | null>(null);
  const gen = Generations.get(GEN_NUM);
  // Warms useMegaSprite.ts's module-level id/URL cache for every
  // Champions-legal Mega form, same call SpeedTiersPage.tsx/TeamCard.tsx make
  // - safe to call again here even when a caller already has (e.g.
  // TeamCard.tsx's own useMegaSpritePrefetch call), since it shares one
  // cache and no-ops once warm. Triggers a re-render (this component has no
  // memoization to route the version counter through) once real sprite URLs
  // land, so a Mega row's fallback-to-base sprite gets replaced live rather
  // than staying pinned to whatever was cached at first render.
  useMegaSpritePrefetch();

  // Same '#tag' type -> move -> ability resolution chain as
  // SpeciesPickerCard.tsx - see that file's header comment for the full
  // writeup. Multiple '#tag's are ANDed together.
  const tags = parseTagFilters(search).filter(t => t.length > 0);
  const isTypeTag = (t: string): boolean => (ALL_TYPES as readonly string[]).includes(t);
  const typeTags = tags.filter(isTypeTag);
  const normalizedNonTypeTags = tags.filter(t => !isTypeTag(t)).map(normalizeNameForAPI);

  const typeMembers = usePokemonTypeFilter(typeTags);
  const moveMembers = usePokemonMoveFilter(normalizedNonTypeTags);
  const moveFailedTags = normalizedNonTypeTags.filter(t => isMoveResolved(t) && moveMembers.get(t) === null);
  const abilityMembers = usePokemonAbilityFilter(moveFailedTags);

  function resolvedSetForTag(tag: string): Set<string> | null {
    if (isTypeTag(tag)) return typeMembers.get(tag) ?? null;
    const normalized = normalizeNameForAPI(tag);
    const moveSet = moveMembers.get(normalized) ?? null;
    if (moveSet !== null) return moveSet;
    if (isMoveResolved(normalized)) return abilityMembers.get(normalized) ?? null;
    return null;
  }

  const tagSets = tags.map(resolvedSetForTag);
  const anyTagPending = tagSets.some(set => set === null);

  // Shared by both the plain-roster and "From Box" halves below - a species
  // (by its own name) or a saved build (by its underlying species) matches
  // the #tag chain the same way.
  const matchesTags = (speciesName: string): boolean =>
    anyTagPending ? false : tagSets.every(set => set!.has(speciesName.toLowerCase()));

  const legalRoster = roster.filter(pkmn => validateSpeciesLegality(pkmn.name, rulesetId));
  const filteredRoster = tags.length === 0
    ? legalRoster.filter(pkmn => pkmn.name.toLowerCase().includes(search.toLowerCase()))
    : legalRoster.filter(pkmn => matchesTags(pkmn.name));

  const speciesRows: StatTableRow[] = filteredRoster.map(species => {
    const stats = getCachedEntry(normalizeSpeciesForAPI(species.name))?.baseStats ?? null;
    return {
      key: `species:${species.name}`,
      displayName: species.name,
      spriteUrl: species.spriteUrl,
      hp: stats?.hp ?? null,
      attack: stats?.attack ?? null,
      defense: stats?.defense ?? null,
      specialAttack: stats?.specialAttack ?? null,
      specialDefense: stats?.specialDefense ?? null,
      speed: stats?.speed ?? null,
      bst: stats ? computeBST(stats) : null,
      onClick: () => onSelect(species),
    };
  });

  // One row per Mega Stone, gated to species already in `legalRoster` (see
  // this file's header) - no #tag matching yet (Leg 3, see TODO.md), so
  // these only show up in the plain-text-search branch, filtered by their
  // own "Mega {Species}" label same as a plain row's name.
  const megaRows: StatTableRow[] = tags.length === 0
    ? Object.entries(MEGA_STONE_TO_SPECIES).flatMap(([item, entry]) => {
      const baseSpecies = legalRoster.find(pkmn => pkmn.name.toLowerCase() === entry.species.toLowerCase());
      if (!baseSpecies) return [];

      const slug = `${entry.species}-${entry.suffix}`;
      const calcSpecies = gen.species.get(toID(slug));
      const stats: PokemonStats | null = calcSpecies ? {
        hp: calcSpecies.baseStats.hp,
        attack: calcSpecies.baseStats.atk,
        defense: calcSpecies.baseStats.def,
        specialAttack: calcSpecies.baseStats.spa,
        specialDefense: calcSpecies.baseStats.spd,
        speed: calcSpecies.baseStats.spe,
      } : null;
      const displayName = formatMegaLabel(baseSpecies.name, entry.suffix);
      if (!displayName.toLowerCase().includes(search.toLowerCase())) return [];

      return [{
        key: `mega:${item}`,
        displayName,
        spriteUrl: getCachedMegaSprite(slug)?.spriteUrl ?? baseSpecies.spriteUrl,
        hp: stats?.hp ?? null,
        attack: stats?.attack ?? null,
        defense: stats?.defense ?? null,
        specialAttack: stats?.specialAttack ?? null,
        specialDefense: stats?.specialDefense ?? null,
        speed: stats?.speed ?? null,
        bst: stats ? computeBST(stats) : null,
        onClick: () => onSelect(baseSpecies, toTitleCase(item)),
      }];
    })
    : [];

  const rows = [...speciesRows, ...megaRows];
  const sortedRows = sort ? sortStatTableRows(rows, sort, row => row[sort.key]) : rows;

  const handleSortClick = (key: StatTableSortKey) => setSort(prev => nextStatTableSort(prev, key));

  const showBoxResults = savedPokemon !== undefined && onSelectSaved !== undefined;
  const filteredSaved = showBoxResults
    ? savedPokemon.filter(entry => validateSpeciesLegality(entry.pokemon.showdownData.species, rulesetId))
      .filter(entry => tags.length === 0
        ? entry.label.toLowerCase().includes(search.toLowerCase()) ||
          entry.pokemon.showdownData.species.toLowerCase().includes(search.toLowerCase())
        : matchesTags(entry.pokemon.showdownData.species))
    : [];

  return (
    <Modal panelClassName="max-w-3xl max-h-[85vh]">
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold text-zinc-100">Add Pokémon</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search species... (#fire, #dragon dance, #fire #flash fire, ...)"
          autoFocus
          className="w-full px-3 py-2 text-sm font-semibold text-white bg-zinc-900 border border-zinc-700 rounded-lg outline-none focus:border-accent-gold"
        />

        {filteredSaved.length > 0 && (
          <div className="shrink-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">From Box</span>
            <div className="flex flex-wrap gap-2 mt-1 max-h-28 overflow-y-auto">
              {filteredSaved.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onSelectSaved!(entry)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 hover:border-accent-gold transition-colors cursor-pointer"
                >
                  <img
                    src={resolveSprite(getPixelSpriteUrl(
                      entry.pokemon.pokedexNumber,
                      entry.pokemon.showdownData.species,
                      entry.pokemon.showdownData.gender || 'M',
                      entry.pokemon.showdownData.shiny
                    ))}
                    alt={entry.pokemon.showdownData.species}
                    loading="lazy"
                    className="w-7 h-7 object-contain [image-rendering:pixelated] shrink-0"
                  />
                  <span className="text-xs text-white truncate max-w-[140px]">{entry.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto border border-zinc-700/60 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900 sticky top-0 z-10">
                <th className="py-2 px-2 text-left text-zinc-400 font-semibold border-b border-zinc-700/60">Species</th>
                {STAT_COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSortClick(col.key)}
                    title={`Sort by ${col.label}`}
                    className={`py-2 px-2 text-right font-semibold border-b border-zinc-700/60 cursor-pointer select-none hover:text-zinc-100 transition-colors ${
                      sort?.key === col.key ? 'text-accent-gold' : getStatLabelColor(col.label)
                    }`}
                  >
                    {col.label}{sort?.key === col.key ? (sort.direction === 'desc' ? ' ▼' : ' ▲') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={STAT_COLUMNS.length + 1} className="py-6 text-center text-zinc-400">
                    {tags.length > 0 && anyTagPending ? 'Loading…' : 'No legal species found'}
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, i) => (
                  <tr
                    key={row.key}
                    onClick={row.onClick}
                    className={`cursor-pointer hover:bg-zinc-700/60 transition-colors ${i % 2 === 1 ? 'bg-zinc-900/30' : ''}`}
                  >
                    <td className="py-1.5 px-2 flex items-center gap-2">
                      <img src={resolveSprite(row.spriteUrl)} alt={row.displayName} loading="lazy" className="w-7 h-7 object-contain [image-rendering:pixelated] shrink-0" />
                      <span className="text-white truncate">{row.displayName}</span>
                    </td>
                    {STAT_COLUMNS.map(col => (
                      <td key={col.key} className="py-1.5 px-2 text-right text-zinc-200 tabular-nums">
                        {row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
