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
 * Multiple chips (type/move/ability, via TagChipInput - see
 * types/tagChip.ts) AND together - a species must match every chip. Each
 * chip already carries its own category (no more type -> move -> ability
 * text-probing fallback chain), so it routes directly to the matching
 * usePokemonTypeFilter/usePokemonMoveFilter/usePokemonAbilityFilter hook. A
 * chip whose category hook is still fetching doesn't filter anything out
 * yet (its set is treated as "no constraint" rather than "excludes
 * everything") - narrowing happens progressively as each chip resolves,
 * instead of the whole result list collapsing to empty/"Loading…" and
 * popping back, which read as a flicker in testing.
 *
 * TagChipInput is the only search input rendered here - its typed query
 * doubles as a plain species-name substring match (via its
 * `onQueryChange`), combining (ANDing) with any active chips, rather than
 * this component also rendering its own separate text box (the first
 * wiring pass did that and it read as two search bars for one search).
 *
 * `savedPokemon`/`onSelectSaved` (Box Tab: Add from Box via Add Pokémon
 * Search, see TODO.md) are an opt-in pair - only TeamCard.tsx's trailing
 * "+ Add Pokémon" slot passes them, so a saved build the user already built
 * for a species can be picked directly instead of always landing a fresh
 * usage-based default. Roster Swap (PokemonCard.tsx) doesn't pass them -
 * it already has its own species-then-saved-set two-step via
 * SavedSetPicker.tsx. When omitted, this renders exactly as before - one
 * flat species list, no "From Box" section. Same search (plain-text
 * label/species match, plus the same chip set by underlying species) as the
 * species half of the list, and the same `validateSpeciesLegality` filter,
 * so a Box entry follows the same rules the species list next to it already
 * does.
 */

import { useMemo, useState } from 'react';
import type { SavedPokemonEntry, SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import type { TagChip } from '../types/tagChip';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter';
import { usePokemonMoveFilter } from '../hooks/usePokemonMoveFilter';
import { usePokemonAbilityFilter } from '../hooks/usePokemonAbilityFilter';
import { useMoveNameList } from '../hooks/useMoveNameList';
import { useAbilityNameList } from '../hooks/useAbilityNameList';
import { ALL_TYPES } from '../config/typeEffectiveness';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import TagChipInput from './TagChipInput';

interface SpeciesPickerCardProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  onSelect: (species: SpeciesRosterEntry) => void;
  onClose: () => void;
  savedPokemon?: SavedPokemonEntry[];
  onSelectSaved?: (entry: SavedPokemonEntry) => void;
}

export default function SpeciesPickerCard({
  roster,
  rulesetId,
  resolveSprite,
  onSelect,
  onClose,
  savedPokemon,
  onSelectSaved,
}: SpeciesPickerCardProps) {
  const [search, setSearch] = useState('');
  const [chips, setChips] = useState<TagChip[]>([]);
  const ref = useDismissable<HTMLDivElement>(onClose);

  // Chip option candidates. Move/ability names come back prettified for
  // display from their name-list hooks (e.g. "Fire Blast") - re-normalizing
  // through normalizeNameForAPI recovers the canonical slug ("fire-blast")
  // TagChip.value is documented to carry (see types/tagChip.ts), since
  // that's the same shape useMoveNameList.ts's own round-trip guarantee
  // already relies on.
  const moveNameList = useMoveNameList();
  const abilityNameList = useAbilityNameList();
  const moveOptions = useMemo(() => moveNameList.map(normalizeNameForAPI), [moveNameList]);
  const abilityOptions = useMemo(() => abilityNameList.map(normalizeNameForAPI), [abilityNameList]);

  // Each chip already carries its own category, so it routes directly to
  // the matching hook - no more type -> move -> ability text-probing
  // fallback chain (see file header comment).
  const typeChipValues = chips.filter((c) => c.category === 'type').map((c) => c.value);
  const moveChipValues = chips.filter((c) => c.category === 'move').map((c) => c.value);
  const abilityChipValues = chips.filter((c) => c.category === 'ability').map((c) => c.value);

  const typeMembers = usePokemonTypeFilter(typeChipValues);
  const moveMembers = usePokemonMoveFilter(moveChipValues);
  const abilityMembers = usePokemonAbilityFilter(abilityChipValues);

  // Resolves one chip to its matching species set, or null while its
  // category's hook is still fetching.
  function resolvedSetForChip(chip: TagChip): Set<string> | null {
    if (chip.category === 'type') return typeMembers.get(chip.value) ?? null;
    if (chip.category === 'move') return moveMembers.get(chip.value) ?? null;
    return abilityMembers.get(chip.value) ?? null;
  }

  const chipSets = chips.map(resolvedSetForChip);

  // Shared by both halves of the list below - a species (by its own name) or
  // a saved build (by its underlying species) matches every active chip. A
  // still-pending chip (`set === null`) imposes no constraint yet - see
  // file header comment.
  const matchesChips = (speciesName: string): boolean =>
    chipSets.every((set) => set === null || set.has(speciesName.toLowerCase()));

  const matchesSearchText = (name: string): boolean =>
    search.trim().length === 0 || name.toLowerCase().includes(search.toLowerCase());

  const legalRoster = roster.filter((pkmn) => validateSpeciesLegality(pkmn.name, rulesetId));
  const filtered = legalRoster
    .filter((pkmn) => matchesSearchText(pkmn.name))
    .filter((pkmn) => chips.length === 0 || matchesChips(pkmn.name));

  const showBoxResults = savedPokemon !== undefined && onSelectSaved !== undefined;
  const filteredSaved = showBoxResults
    ? savedPokemon
        .filter((entry) => validateSpeciesLegality(entry.pokemon.showdownData.species, rulesetId))
        .filter(
          (entry) =>
            entry.label.toLowerCase().includes(search.toLowerCase()) ||
            matchesSearchText(entry.pokemon.showdownData.species),
        )
        .filter((entry) => chips.length === 0 || matchesChips(entry.pokemon.showdownData.species))
    : [];

  return (
    <div
      ref={ref}
      className="relative bg-zinc-700 border-2 border-accent-gold rounded-lg p-3 flex flex-col gap-3 max-w-[280px] min-h-[280px] max-h-[32rem]"
    >
      <button
        onClick={onClose}
        title="Cancel"
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
      >
        ×
      </button>

      <TagChipInput
        chips={chips}
        onChipsChange={setChips}
        typeOptions={[...ALL_TYPES]}
        moveOptions={moveOptions}
        abilityOptions={abilityOptions}
        onQueryChange={setSearch}
        autoFocus
      />

      {/* Results fill the rest of the slot, capped and scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 && filteredSaved.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center mt-4">No legal species found</p>
        ) : (
          <>
            {filteredSaved.length > 0 && (
              <>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2">
                  From Box
                </span>
                {filteredSaved.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onSelectSaved!(entry)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
                  >
                    <img
                      src={resolveSprite(
                        getPixelSpriteUrl(
                          entry.pokemon.pokedexNumber,
                          entry.pokemon.showdownData.species,
                          entry.pokemon.showdownData.gender || 'M',
                          entry.pokemon.showdownData.shiny,
                        ),
                      )}
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
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide px-2 mt-1">
                    Species
                  </span>
                )}
                {filtered.map((pkmn) => (
                  <div
                    key={pkmn.id}
                    onClick={() => onSelect(pkmn)}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
                  >
                    <img
                      src={resolveSprite(pkmn.spriteUrl)}
                      alt={pkmn.name}
                      loading="lazy"
                      className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0"
                    />
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
