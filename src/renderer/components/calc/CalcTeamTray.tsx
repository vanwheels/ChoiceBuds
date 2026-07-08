/**
 * CalcTeamTray.tsx - "Load From Team" Picker for One Calc Pokemon Panel
 * Replaces the Platinum Kaizo calc fork's Team/Box concept (a drag-between-
 * boxes Pokemon storage UI that doesn't map to this app - see TODO.md) with
 * a dropdown of the user's saved Teams plus a row of up to 6 sprites for the
 * selected team. Click loads directly into this panel's own Pokemon slot;
 * drag lets it land on either panel (see CalcPokemonPanel.tsx's drop
 * handling) - mirrored identically on both the Pokémon 1 and Pokémon 2
 * panels, unlike Kaizo's opponent side which shows ROM-hack-specific AI
 * flags/exp instead.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import type { Team, ImportedPokemonInfo } from '../../types/pokemon';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { CALC_TEAM_POKEMON_DRAG_TYPE, type CalcTeamPokemonDragPayload } from '../../utils/calcDragTypes';

interface CalcTeamTrayProps {
  teams: Team[];
  resolveSprite: (remoteUrl: string) => string;
  onLoadPokemon: (p: ImportedPokemonInfo) => void;
}

export default function CalcTeamTray({ teams, resolveSprite, onLoadPokemon }: CalcTeamTrayProps) {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  if (teams.length === 0) return null;

  const handleDragStart = (teamId: string, pokemonIndex: number) => (e: DragEvent) => {
    const payload: CalcTeamPokemonDragPayload = { teamId, pokemonIndex };
    e.dataTransfer.setData(CALC_TEAM_POKEMON_DRAG_TYPE, JSON.stringify(payload));
  };

  return (
    <div className="flex flex-col gap-1.5 pb-3 border-b border-zinc-800">
      <label className="text-[10px] text-gray-400 uppercase tracking-wide">Load from Team</label>
      <select
        value={selectedTeamId}
        onChange={(e) => setSelectedTeamId(e.target.value)}
        className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
      >
        <option value="">Select a team...</option>
        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      {selectedTeam && (
        <div className="flex gap-1.5 flex-wrap">
          {selectedTeam.pokemon.map((p, i) => (
            <button
              key={i}
              type="button"
              draggable
              onDragStart={handleDragStart(selectedTeam.id, i)}
              onClick={() => onLoadPokemon(p)}
              title={`${p.showdownData.nickname || p.showdownData.species} - click or drag onto a panel to load`}
              className="w-9 h-9 shrink-0 rounded bg-gray-800 border border-gray-600 hover:border-blue-500 flex items-center justify-center cursor-grab transition-colors"
            >
              <img
                src={resolveSprite(getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny))}
                alt={p.showdownData.species}
                className="w-7 h-7 object-contain [image-rendering:pixelated]"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
