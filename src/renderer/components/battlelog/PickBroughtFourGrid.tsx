/**
 * PickBroughtFourGrid.tsx - Capped Multi-Select for "Bring 4 of 6" (VGC)
 * Deliberately not SpeciesPickerCard (that component is single-select-then-
 * close) - this toggles membership in a selection capped at 4, confirmed
 * explicitly rather than committing on click.
 */

import type { ImportedPokemonInfo } from '../../types/pokemon';

interface PickBroughtFourGridProps {
  pokemon: ImportedPokemonInfo[];
  selectedIndices: number[];
  onToggle: (index: number) => void;
  resolveSprite: (remoteUrl: string) => string;
}

export default function PickBroughtFourGrid({ pokemon, selectedIndices, onToggle, resolveSprite }: PickBroughtFourGridProps) {
  const selectedSet = new Set(selectedIndices);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {pokemon.map((p, index) => {
        const isSelected = selectedSet.has(index);
        const isDisabled = !isSelected && selectedIndices.length >= 4;

        return (
          <button
            key={index}
            type="button"
            disabled={isDisabled}
            onClick={() => onToggle(index)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-600/20'
                : isDisabled
                  ? 'border-gray-800 bg-gray-900/40 opacity-40 cursor-not-allowed'
                  : 'border-gray-700 bg-gray-800 hover:border-blue-500 cursor-pointer'
            }`}
          >
            <img
              src={resolveSprite(p.spriteUrl)}
              alt={p.showdownData.species}
              className="w-12 h-12 object-contain [image-rendering:pixelated]"
            />
            <span className="text-xs text-gray-200 truncate max-w-full">
              {p.showdownData.nickname || p.showdownData.species}
            </span>
          </button>
        );
      })}
    </div>
  );
}
