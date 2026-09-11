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
 * Search is plain-text species-name matching only - not SpeciesPickerCard's
 * '#tag' type/move/ability chain, which wasn't asked for here.
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
 * Mega forms are excluded (see TODO.md's Leg 1 scoping note) - `roster` here
 * is the same base legal-roster list SpeciesPickerCard already receives.
 *
 * `savedPokemon`/`onSelectSaved` (From Box) mirrors SpeciesPickerCard's own
 * opt-in pair exactly - same filtering rules, same omitted-means-no-section
 * behavior - so TeamCard.tsx's existing "From Box" support carries over
 * unchanged.
 */

import { useState } from 'react';
import type { PokeAPICacheEntry, SavedPokemonEntry, SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { normalizeSpeciesForAPI } from '../services/pokeapi';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getStatLabelColor } from '../config/pokemonTheme';
import { computeBST, nextStatTableSort, sortStatTableRows } from '../utils/statTable';
import type { StatTableSort, StatTableSortKey } from '../utils/statTable';
import Modal from './Modal';

interface AddPokemonStatTableProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  getCachedEntry: (species: string) => PokeAPICacheEntry | null;
  onSelect: (species: SpeciesRosterEntry) => void;
  onClose: () => void;
  savedPokemon?: SavedPokemonEntry[];
  onSelectSaved?: (entry: SavedPokemonEntry) => void;
}

interface StatTableRow {
  species: SpeciesRosterEntry;
  hp: number | null;
  attack: number | null;
  defense: number | null;
  specialAttack: number | null;
  specialDefense: number | null;
  speed: number | null;
  bst: number | null;
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

  const legalRoster = roster.filter(pkmn => validateSpeciesLegality(pkmn.name, rulesetId));
  const filteredRoster = search.trim() === ''
    ? legalRoster
    : legalRoster.filter(pkmn => pkmn.name.toLowerCase().includes(search.toLowerCase()));

  const rows: StatTableRow[] = filteredRoster.map(species => {
    const stats = getCachedEntry(normalizeSpeciesForAPI(species.name))?.baseStats ?? null;
    return {
      species,
      hp: stats?.hp ?? null,
      attack: stats?.attack ?? null,
      defense: stats?.defense ?? null,
      specialAttack: stats?.specialAttack ?? null,
      specialDefense: stats?.specialDefense ?? null,
      speed: stats?.speed ?? null,
      bst: stats ? computeBST(stats) : null,
    };
  });

  const sortedRows = sort ? sortStatTableRows(rows, sort, row => row[sort.key]) : rows;

  const handleSortClick = (key: StatTableSortKey) => setSort(prev => nextStatTableSort(prev, key));

  const showBoxResults = savedPokemon !== undefined && onSelectSaved !== undefined;
  const filteredSaved = showBoxResults
    ? savedPokemon.filter(entry => validateSpeciesLegality(entry.pokemon.showdownData.species, rulesetId))
      .filter(entry => search.trim() === '' ||
        entry.label.toLowerCase().includes(search.toLowerCase()) ||
        entry.pokemon.showdownData.species.toLowerCase().includes(search.toLowerCase()))
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
          placeholder="Search species..."
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
                    No legal species found
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, i) => (
                  <tr
                    key={row.species.id}
                    onClick={() => onSelect(row.species)}
                    className={`cursor-pointer hover:bg-zinc-700/60 transition-colors ${i % 2 === 1 ? 'bg-zinc-900/30' : ''}`}
                  >
                    <td className="py-1.5 px-2 flex items-center gap-2">
                      <img src={resolveSprite(row.species.spriteUrl)} alt={row.species.name} loading="lazy" className="w-7 h-7 object-contain [image-rendering:pixelated] shrink-0" />
                      <span className="text-white truncate">{row.species.name}</span>
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
