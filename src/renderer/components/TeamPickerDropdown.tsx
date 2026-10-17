/**
 * TeamPickerDropdown.tsx - Sprite-Aware Team Picker
 * Shared replacement for the plain native `<select>` previously duplicated
 * across CalcTeamTray.tsx, SpeedTiersPage.tsx, TypeMatchupPage.tsx, and
 * RecordMatchForm.tsx (Team Picker Sprites: Adoption, see TODO.md) - a text-
 * only select can't show per-team sprites, so species recognition required
 * opening the team first. Self-contained (owns its own open/close state and
 * trigger button) rather than "pure content" like AbilityPickerPanel.tsx/
 * ItemPickerPanel.tsx, which rely on EditOverlays.tsx + FloatingCardPanel for
 * the trigger, anchor-rect positioning, and card-width lock - those exist to
 * float a panel over a specific card region, which none of this component's
 * call sites need; this is a drop-in field anchored to its own trigger
 * button instead, same as the native `<select>` it replaces.
 */

import { useState } from 'react';
import type { Team } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { getPixelSpriteUrl } from '../utils/spriteUrl';

interface TeamSpriteRowProps {
  pokemon: Team['pokemon'];
  resolveSprite: (remoteUrl: string) => string;
}

function TeamSpriteRow({ pokemon, resolveSprite }: TeamSpriteRowProps) {
  if (pokemon.length === 0) return null;
  return (
    <div className="flex gap-0.5 shrink-0">
      {pokemon.map((p, idx) => (
        <img
          key={idx}
          src={resolveSprite(
            getPixelSpriteUrl(
              p.pokedexNumber,
              p.showdownData.species,
              p.showdownData.gender || 'M',
              p.showdownData.shiny,
            ),
          )}
          alt={p.showdownData.species}
          className="w-4 h-4 object-contain [image-rendering:pixelated]"
        />
      ))}
    </div>
  );
}

interface TeamPickerDropdownProps {
  teams: Team[];
  selectedTeamId: string;
  onSelect: (teamId: string) => void;
  resolveSprite: (remoteUrl: string) => string;
  placeholder?: string;
  className?: string;
}

export default function TeamPickerDropdown({
  teams,
  selectedTeamId,
  onSelect,
  resolveSprite,
  placeholder = 'Select a team...',
  className = '',
}: TeamPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(() => setIsOpen(false));

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const filtered = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (teamId: string) => {
    onSelect(teamId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold hover:border-accent-gold transition-colors"
      >
        {selectedTeam ? (
          <TeamSpriteRow pokemon={selectedTeam.pokemon} resolveSprite={resolveSprite} />
        ) : null}
        <span className={`truncate flex-1 text-left ${selectedTeam ? '' : 'text-zinc-400'}`}>
          {selectedTeam ? selectedTeam.name : placeholder}
        </span>
        <span className="text-zinc-400 text-xs shrink-0">▾</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 flex flex-col gap-2 bg-zinc-800 border-2 border-accent-gold rounded-lg p-2 max-h-72 overflow-hidden">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            autoFocus
            className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-900 border border-zinc-600 rounded text-center outline-none focus:border-accent-gold"
          />
          <div className="overflow-y-auto flex flex-col gap-1 flex-1 min-h-0">
            <div
              onClick={() => handleSelect('')}
              className="px-2 py-1 rounded hover:bg-zinc-700 cursor-pointer transition-colors text-zinc-400 text-sm"
            >
              {placeholder}
            </div>
            {filtered.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center mt-2">No teams found</p>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-700 cursor-pointer transition-colors ${
                    t.id === selectedTeamId ? 'bg-zinc-700' : ''
                  }`}
                >
                  <TeamSpriteRow pokemon={t.pokemon} resolveSprite={resolveSprite} />
                  <div className="min-w-0 flex-1">
                    <div className="text-white text-sm font-medium truncate">{t.name}</div>
                    <div className="text-zinc-400 text-xs truncate">
                      {t.format} · {t.pokemon.length} Pokémon
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
