/**
 * AddToTeamDialog.tsx - "Add to Team…" Team Picker
 * Box Tab Leg 4 (see TODO.md): the reverse direction of SaveToLibraryDialog -
 * copies a Box entry onto an existing team rather than saving a team
 * Pokémon into Box. Deliberately a copy, not a move ("Import" wording,
 * matching every other paste/duplicate in the codebase) - the Box entry
 * stays put; clicking a team clones the saved Pokémon
 * (`utils/clonePokemon.ts::cloneSavedPokemon`, the same clone
 * TeamCard.tsx::handlePasteNewPokemon uses for a clipboard paste) and
 * appends it via `updateTeam`.
 *
 * Same `Modal.tsx` shell/`max-w-sm` shape as SaveToLibraryDialog. Teams are
 * listed in `teams`' existing stored order (no re-sorting, matching how the
 * Teams tab itself displays them). A full team (6/6) still renders in the
 * list, disabled with a "Full" tag, rather than being hidden - there's no
 * "replace a slot" flow anywhere in the app to fall back to, so hiding it
 * would just read as a missing team.
 */

import { useState } from 'react';
import type { ImportedPokemonInfo, Team } from '../types/pokemon';
import { cloneSavedPokemon } from '../utils/clonePokemon';
import Modal from './Modal';

interface AddToTeamDialogProps {
  pokemon: ImportedPokemonInfo;
  teams: Team[];
  onAddToTeam: (teamId: string, cloned: ImportedPokemonInfo) => Promise<boolean>;
  onClose: () => void;
}

export default function AddToTeamDialog({ pokemon, teams, onAddToTeam, onClose }: AddToTeamDialogProps) {
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (team: Team) => {
    if (team.pokemon.length >= 6 || pendingTeamId) return;
    setPendingTeamId(team.id);
    setError(null);
    const success = await onAddToTeam(team.id, cloneSavedPokemon(pokemon));
    if (success) {
      onClose();
    } else {
      setError('Failed to add - please try again');
      setPendingTeamId(null);
    }
  };

  return (
    <Modal panelClassName="max-w-sm">
      <div className="px-5 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-100">Add to Team</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {teams.length === 0 ? (
          <p className="text-sm text-zinc-400">No teams yet - create one from the Teams tab first.</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {teams.map((team) => {
              const isFull = team.pokemon.length >= 6;
              return (
                <button
                  key={team.id}
                  onClick={() => handlePick(team)}
                  disabled={isFull || pendingTeamId !== null}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-zinc-700 border border-zinc-600 rounded-lg text-left transition-colors enabled:hover:border-accent-gold enabled:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="text-sm font-medium text-zinc-100 truncate">{team.name}</span>
                  {isFull ? (
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                      Full
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-400">{team.pokemon.length}/6</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="p-2 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg text-red-200 text-xs">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
