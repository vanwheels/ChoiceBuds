/**
 * TeamCard.tsx - Individual Team Card Layout Renderer
 * Displays team header with name, regulation, pokemon thumbnails, and action buttons
 * Expands to show detailed PokemonCard list when toggled
 */

import type { Team } from '../types/pokemon';
import PokemonCard from './PokemonCard';

interface TeamCardProps {
  team: Team;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}

/**
 * Renders a collapsible team card with header and expandable pokemon details
 */
export default function TeamCard({
  team,
  isExpanded,
  onToggleExpand,
  onDelete,
  onEdit,
}: TeamCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden w-full">
      {/* Team Header - Horizontal Card Slot Container */}
      <div className="flex flex-row justify-between items-center w-full mb-4 pb-2 border-b border-zinc-800/40 p-4 hover:bg-gray-750 transition-colors">
        {/* Left Side: Team Name and Regulation Tag */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-100 truncate">
            {team.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium">
              {team.format}
            </span>
            {team.pokemon[0]?.showdownData.teraType && (
              <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded font-medium">
                Reg: {team.pokemon[0].showdownData.teraType}
              </span>
            )}
          </div>
        </div>

        {/* Middle: 6 Small Horizontal Pokemon Thumbnail Sprites */}
        <div className="flex gap-2">
          {team.pokemon.slice(0, 6).map((pokemon, index) => (
            <div
              key={index}
              className="w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0"
              title={pokemon.showdownData.nickname || pokemon.showdownData.species}
            >
              {pokemon.spriteUrl ? (
                <img
                  src={pokemon.spriteUrl}
                  alt={pokemon.showdownData.species}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400">
                  #{pokemon.pokedexNumber}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm font-medium transition-colors"
              title="Edit team"
            >
              Edit
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-850 text-base font-medium transition-all cursor-pointer"
              title="Delete team"
            >
              ×
            </button>
            <button
              onClick={onToggleExpand}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Pokemon Details - Horizontal Grid Layout */}
      {isExpanded && (
        <div className="border-t border-gray-700 bg-gray-850">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
            {team.pokemon.map((pokemon, index) => (
              <PokemonCard key={index} pokemon={pokemon} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
