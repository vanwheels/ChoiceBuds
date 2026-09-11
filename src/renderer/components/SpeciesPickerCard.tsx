/**
 * SpeciesPickerCard.tsx - In-Slot Species Picker
 * Renders in place of a PokemonCard's own content (matching its container
 * styling) rather than as a floating dropdown - the search input sits where
 * the Nickname row normally is, so it lines up with the other cards in the
 * row, and results fill the rest of the slot. Used for both Roster Swap
 * (PokemonCard) and the trailing Add Pokémon slot (TeamCard).
 *
 * The results list has an explicit max-height (not just `h-full`): a grid
 * row's height is only as tall as its content dictates, and if this picker
 * were the only thing in its row, `h-full` would have nothing definite to
 * stretch to, so the full unfiltered roster would render and stretch the
 * slot/row instead of scrolling - hence the fixed cap here.
 *
 * Multiple '#tag's in one search (e.g. '#fire #shadowclaw #flashfire') are
 * ANDed together - a species must match every tag, mixing type/move/ability
 * tags freely in the same query. Each tag runs through its own type -> move
 * -> ability fallback chain independently (see the per-tag loop below),
 * then a species is kept only if it appears in every tag's resolved set.
 *
 * `savedPokemon`/`onSelectSaved` (Box Tab: Add from Box via Add Pokémon
 * Search, see TODO.md) are an opt-in pair - only TeamCard.tsx's trailing
 * "+ Add Pokémon" slot passes them, so a saved build the user already built
 * for a species can be picked directly instead of always landing a fresh
 * usage-based default. Roster Swap (PokemonCard.tsx) and Box's own
 * "+ New Build" (BoxPage.tsx) don't pass them - picking a Box entry from
 * inside Box's own creation flow would be circular, and Roster Swap already
 * has its own species-then-saved-set two-step via SavedSetPicker.tsx. When
 * omitted, this renders exactly as before - one flat species list, no
 * "From Box" section. Same search (plain-text label/species match, or the
 * same #tag chain by underlying species) as the species half of the list,
 * and the same `validateSpeciesLegality` filter, so a Box entry follows the
 * same rules the species list next to it already does.
 */

import { useState } from 'react';
import type { SavedPokemonEntry, SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter';
import { usePokemonMoveFilter, isMoveResolved } from '../hooks/usePokemonMoveFilter';
import { usePokemonAbilityFilter } from '../hooks/usePokemonAbilityFilter';
import { parseTagFilters } from '../utils/tagSearch';
import { ALL_TYPES } from '../config/typeEffectiveness';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { getPixelSpriteUrl } from '../utils/spriteUrl';

interface SpeciesPickerCardProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  onSelect: (species: SpeciesRosterEntry) => void;
  onClose: () => void;
  savedPokemon?: SavedPokemonEntry[];
  onSelectSaved?: (entry: SavedPokemonEntry) => void;
}

export default function SpeciesPickerCard({ roster, rulesetId, resolveSprite, onSelect, onClose, savedPokemon, onSelectSaved }: SpeciesPickerCardProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  // A '#tag' is a type lookup when it names one of the 18 real types;
  // otherwise it's tried as a move name first, surfacing every species that
  // can learn it (learned_by_pokemon) rather than requiring an exact species
  // name match - see usePokemonMoveFilter.ts. Only once the move lookup
  // confirms a 404 (isMoveResolved true, its set still null - not just
  // "hasn't loaded yet") does it fall back to an ability name lookup
  // against /ability/{name}'s `pokemon` field - see usePokemonAbilityFilter.ts.
  // Multiple '#tag's run this same chain independently and are ANDed
  // together at the end (see file header comment).
  const tags = parseTagFilters(search).filter(t => t.length > 0);
  const isTypeTag = (t: string): boolean => (ALL_TYPES as readonly string[]).includes(t);
  const typeTags = tags.filter(isTypeTag);
  const normalizedNonTypeTags = tags.filter(t => !isTypeTag(t)).map(normalizeNameForAPI);

  const typeMembers = usePokemonTypeFilter(typeTags);
  const moveMembers = usePokemonMoveFilter(normalizedNonTypeTags);
  const moveFailedTags = normalizedNonTypeTags.filter(t => isMoveResolved(t) && moveMembers.get(t) === null);
  const abilityMembers = usePokemonAbilityFilter(moveFailedTags);

  // Resolves one tag to its matching species set, or null while it's still
  // in flight somewhere along the type -> move -> ability chain.
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

  // Shared by both halves of the list below - a species (by its own name) or
  // a saved build (by its underlying species) matches the #tag chain the
  // same way.
  const matchesTags = (speciesName: string): boolean =>
    anyTagPending ? false : tagSets.every(set => set!.has(speciesName.toLowerCase()));

  const legalRoster = roster.filter(pkmn => validateSpeciesLegality(pkmn.name, rulesetId));
  const filtered = tags.length === 0
    ? legalRoster.filter(pkmn => pkmn.name.toLowerCase().includes(search.toLowerCase()))
    : legalRoster.filter(pkmn => matchesTags(pkmn.name));

  const showBoxResults = savedPokemon !== undefined && onSelectSaved !== undefined;
  const filteredSaved = showBoxResults
    ? savedPokemon.filter(entry => validateSpeciesLegality(entry.pokemon.showdownData.species, rulesetId))
      .filter(entry => tags.length === 0
        ? entry.label.toLowerCase().includes(search.toLowerCase()) ||
          entry.pokemon.showdownData.species.toLowerCase().includes(search.toLowerCase())
        : matchesTags(entry.pokemon.showdownData.species))
    : [];

  return (
    <div ref={ref} className="relative bg-zinc-700 border-2 border-accent-gold rounded-lg p-3 flex flex-col gap-3 max-w-[280px] min-h-[280px] max-h-[32rem]">
      <button
        onClick={onClose}
        title="Cancel"
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
      >
        ×
      </button>

      {/* Search bar aligned with the Nickname row on other cards */}
      <div className="text-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search species... (#fire, #dragon dance, #fire #flash fire, ...)"
          autoFocus
          className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-800 border border-zinc-600 rounded text-center outline-none focus:border-accent-gold"
        />
      </div>

      {/* Results fill the rest of the slot, capped and scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 && filteredSaved.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center mt-4">
            {tags.length > 0 && anyTagPending ? 'Loading…' : 'No legal species found'}
          </p>
        ) : (
          <>
            {filteredSaved.length > 0 && (
              <>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2">From Box</span>
                {filteredSaved.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => onSelectSaved!(entry)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
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
                      className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0"
                    />
                    <span className="text-xs text-white truncate">{entry.label}</span>
                  </div>
                ))}
              </>
            )}

            {filtered.length > 0 && (
              <>
                {filteredSaved.length > 0 && (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2 mt-1">Species</span>
                )}
                {filtered.map(pkmn => (
                  <div
                    key={pkmn.id}
                    onClick={() => onSelect(pkmn)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
                  >
                    <img src={resolveSprite(pkmn.spriteUrl)} alt={pkmn.name} loading="lazy" className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0" />
                    <span className="text-xs text-white truncate">{pkmn.name}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
