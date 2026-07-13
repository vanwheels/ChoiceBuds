/**
 * CalcSavedSetPicker.tsx - "Load a Saved Set" Popover for Species Search
 * Opens under a CalcPokemonPanel's species field when a real Autocomplete
 * list-click (not typing) lands on a species with 1+ saved sets - see
 * CalcAutocomplete.tsx's onSelect and CalcPokemonPanel.tsx's wiring. Loading
 * a saved set reuses the exact same teamPokemonToCalcUpdates mapper the
 * "Load from Team" tray already uses (CalcTeamTray.tsx) - both apply a whole
 * ImportedPokemonInfo-shaped object onto the panel identically. "Blank"
 * just closes the popover - the species field was already set the moment
 * the user picked it, matching how species-only selection has always worked
 * here (nothing else on the panel resets).
 *
 * Deletion/renaming aren't offered here - that's CalcSavedSetsModal.tsx's
 * job, kept as one single place to manage the saved-set library instead of
 * splitting it across two surfaces.
 */

import type { SavedPokemonEntry } from '../../types/pokemon';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { useDismissable } from '../../hooks/useDismissable';

interface CalcSavedSetPickerProps {
  species: string;
  sets: SavedPokemonEntry[];
  resolveSprite: (remoteUrl: string) => string;
  onPick: (entry: SavedPokemonEntry) => void;
  onClose: () => void;
}

export default function CalcSavedSetPicker({ species, sets, resolveSprite, onPick, onClose }: CalcSavedSetPickerProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);

  return (
    <div ref={ref} className="absolute z-50 top-full left-0 mt-1 w-56 p-2 rounded-lg border border-zinc-700 bg-slate-900 shadow-xl flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide truncate">Saved {species} sets</span>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-red-400 cursor-pointer text-xs shrink-0">×</button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-left px-2 py-1 text-xs rounded text-zinc-400 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
      >
        Blank
      </button>

      {sets.map(entry => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onPick(entry)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-blue-600 cursor-pointer transition-colors text-left"
        >
          <img
            src={resolveSprite(getPixelSpriteUrl(
              entry.pokemon.pokedexNumber,
              entry.pokemon.showdownData.species,
              entry.pokemon.showdownData.gender || 'M',
              entry.pokemon.showdownData.shiny
            ))}
            alt={entry.pokemon.showdownData.species}
            className="w-6 h-6 object-contain [image-rendering:pixelated] shrink-0"
          />
          <span className="text-xs text-zinc-200 truncate">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}
