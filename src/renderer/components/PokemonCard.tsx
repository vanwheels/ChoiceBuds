/**
 * PokemonCard.tsx - Detailed Pokemon Card Layout Renderer
 * Two-column layout: Left (Stats) and Right (Assets & Badges)
 * Displays comprehensive pokemon details with type-themed styling
 */

import type { ImportedPokemonInfo } from '../types/pokemon';
import TypeBadge from './TypeBadge';
import MoveBanner from './MoveBanner';
import StatsColumn from './StatsColumn';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
}

/**
 * Renders a detailed expanded pokemon card with two-column layout
 */
export default function PokemonCard({ pokemon }: PokemonCardProps) {
  const { showdownData, types, spriteUrl, pokedexNumber } = pokemon;

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Stats */}
        <StatsColumn pokemon={pokemon} />

        {/* Right Column: Assets & Badges */}
        <div className="space-y-4">
          {/* Nickname and Species */}
          <div>
            {showdownData.nickname && (
              <h4 className="text-lg font-bold text-gray-100">
                {showdownData.nickname}
              </h4>
            )}
            <p className="text-sm text-gray-300">
              {showdownData.species} #{pokedexNumber}
            </p>
          </div>

          {/* Large Pokemon Sprite */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
              {spriteUrl ? (
                <img
                  src={spriteUrl}
                  alt={showdownData.species}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-400">No sprite</span>
              )}
            </div>
          </div>

          {/* Dual Type Badges */}
          <div className="flex gap-2 justify-center">
            {types.map((type, index) => (
              <TypeBadge key={index} type={type} />
            ))}
          </div>

          {/* Held Item */}
          {showdownData.item && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-800 rounded-full border border-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-gray-400">📦</span>
              </div>
              <span className="text-sm text-gray-300">{showdownData.item}</span>
            </div>
          )}

          {/* Ability */}
          {showdownData.ability && (
            <div className="bg-gray-800 rounded px-3 py-2 border border-gray-600">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Ability</p>
              <p className="text-sm text-gray-100 font-medium">{showdownData.ability}</p>
            </div>
          )}

          {/* Tera Type */}
          {showdownData.teraType && (
            <div className="bg-purple-900 bg-opacity-30 rounded px-3 py-2 border border-purple-700">
              <p className="text-xs text-purple-300 uppercase tracking-wide">Tera Type</p>
              <p className="text-sm text-purple-100 font-medium">{showdownData.teraType}</p>
            </div>
          )}

          {/* 4 Move Banners */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Moves</p>
            {showdownData.moves.slice(0, 4).map((move, index) => (
              <MoveBanner key={index} moveName={move} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
