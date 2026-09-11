/**
 * SavedSetPicker.tsx - "Load a Saved Set" Popover
 * Shared between two trigger points, both offering a saved-build choice the
 * instant a species with 1+ saved sets is explicitly picked from a list
 * (never while just typing a search):
 *  - CalcPokemonPanel.tsx's species Autocomplete (see its onSelect wiring) -
 *    loading a saved set there reuses the same teamPokemonToCalcUpdates
 *    mapper the "Load from Team" tray already uses (CalcTeamTray.tsx).
 *  - PokemonCard.tsx's Roster Swap species picker (Saved Builds Database for
 *    Team-Building Leg 1, see TODO.md) - loading a saved set there goes
 *    through useRosterActions.ts::loadSavedSet.
 *
 * onBlank and onClose are deliberately separate callbacks, not one dual-
 * purpose close handler: on the Calc panel the species field is already
 * applied to state the moment it's picked (nothing else resets), so both
 * amount to the same no-op dismiss there. On a Roster Swap, nothing has
 * changed yet when this opens - "Blank" has to actively commit a fresh
 * default-usage build (mirrors what selecting a species with no saved sets
 * does today), while dismissing (the × button or clicking outside) has to
 * cancel the whole swap and leave the slot's current occupant untouched.
 *
 * Deletion/renaming aren't offered here - that's CalcSavedSetsModal.tsx's
 * job, kept as one single place to manage the saved-set library instead of
 * splitting it across every surface that can load from it.
 */

import type { SavedPokemonEntry } from '../types/pokemon';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { useDismissable } from '../hooks/useDismissable';

interface SavedSetPickerProps {
  species: string;
  sets: SavedPokemonEntry[];
  resolveSprite: (remoteUrl: string) => string;
  onPick: (entry: SavedPokemonEntry) => void;
  onBlank: () => void;
  onClose: () => void;
  /** Horizontal anchor against the relative-positioned parent. Calc's species field is the left edge of a wide row (left works fine); PokemonCard's sprite box is centered in a narrow card, so it needs to center under it instead. Defaults to 'left' to match the original Calc-only behavior. */
  align?: 'left' | 'center';
}

export default function SavedSetPicker({ species, sets, resolveSprite, onPick, onBlank, onClose, align = 'left' }: SavedSetPickerProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  const alignClass = align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <div ref={ref} className={`absolute z-50 top-full ${alignClass} mt-1 w-56 p-2 rounded-lg border border-zinc-700 bg-slate-900 shadow-xl flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide truncate">Saved {species} sets</span>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-red-400 cursor-pointer text-xs shrink-0">×</button>
      </div>

      <button
        type="button"
        onClick={onBlank}
        className="text-left px-2 py-1 text-xs rounded text-zinc-400 hover:bg-accent-gold hover:text-zinc-900 cursor-pointer transition-colors"
      >
        Blank
      </button>

      {sets.map(entry => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onPick(entry)}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent-gold hover:text-zinc-900 cursor-pointer transition-colors text-left"
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
