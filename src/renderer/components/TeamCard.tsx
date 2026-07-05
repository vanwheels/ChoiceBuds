import { useState } from 'react';
import { Team } from '../types/pokemon';
import PokemonCard from './PokemonCard';

interface TeamCardProps {
  team: Team;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function TeamCard({ team, onDelete, onEdit }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-auto mx-6 bg-zinc-900/40 border border-zinc-800/80 rounded-xl mb-4 overflow-hidden transition-all">
      
      {/* MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls */}
      <div className="w-full flex flex-row items-center h-16 px-6 bg-zinc-950/40 transition-colors">
        {/* Horizontal Mini Sprites Row with clean end-to-end padding and internal spacing gaps */}
        <div className="flex flex-row items-center gap-3 mr-6">
          {team.pokemon && team.pokemon.map((p, idx) => (
            <img
              key={idx}
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.showdownData.shiny ? 'shiny/' : ''}${p.pokedexNumber}.png`}
              alt={p.showdownData.species}
              className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0"
            />
          ))}
        </div>

        {/* Team Title */}
        <h2 className="flex-1 text-left font-bold text-sm text-zinc-100 truncate tracking-wide">
          {team.name.replace(/^(Reg\s*M-[AB]\s*)+/i, '').trim() || 'Untitled Team'}
        </h2>

        {/* Far-Right Controls Cluster */}
        <div className="flex flex-row items-center gap-2 shrink-0 ml-4">
          {/* A. Regulation Indicator Badge */}
          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-600 text-white mr-2">
            {team.format || 'Reg M-A'}
          </div>

          {/* B. Delete Button */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
              title="Delete Team"
            >
              ×
            </button>
          )}

          {/* C. Edit Button */}
          <button
            onClick={onEdit}
            title="Edit Team"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
          >
            ✎
          </button>

          {/* D. Expand/Collapse Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-sm transition-all cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            ▼
          </button>
        </div>
      </div>

      {/* EXPANDED VIEW CONTAINER - RENDERS THE INDIVIDUAL EXPANDED POKEMON CARDS */}
      {isExpanded && (
        <div className="p-6 border-t border-zinc-800/60 bg-zinc-900/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
            {team.pokemon && team.pokemon.map((p, idx) => (
              <PokemonCard key={idx} pokemon={p} teamId={team.id} pokemonIndex={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
