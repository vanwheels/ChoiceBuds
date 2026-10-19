/**
 * AddTeamToProfileDialog.tsx - "+ Team" Picker for a Profile Section
 * Profile Section Add-Team Picker (see TODO.md): opened from
 * ProfileTeamSection.tsx's trailing "+ Team" box. Lists every local team not
 * already in the section's own tier (`availableTeams`, computed by
 * ProfileCard.tsx from the full local `teams`, not the synced/lagging
 * `profile.teams` - same reasoning as ProfileEditControls.tsx's own
 * visibility dropdowns) and sets the picked team's `visibility` to that
 * tier through the normal `updateTeam` path.
 *
 * Same Modal.tsx shell/list-of-buttons shape as AddToTeamDialog.tsx, with a
 * sprite-strip row instead of a bare name - visually the same strip
 * MobileTeamRow.tsx/TeamCardHeader.tsx each already compute, not factored
 * into a shared util since this is a third narrow use rather than a second
 * (per CLAUDE.md: duplication over a premature abstraction here).
 *
 * Sized/laid out like CalcSavedSetsModal.tsx's own pick-from-list modal
 * (`max-w-2xl max-h-[85vh]`, a `flex-1 overflow-y-auto` body) rather than
 * AddToTeamDialog.tsx's compact `max-w-sm` - a sprite-strip row needs more
 * horizontal room than a bare team name, and this list has no 6/6 "Full"
 * cap keeping it short the way AddToTeamDialog.tsx's always does.
 */

import { useState } from 'react';
import type { Team } from '../../types/pokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { getMegaApiSlug } from '../../config/megaEvolution';
import { getCachedMegaSprite } from '../../hooks/useMegaSprite';
import Modal from '../Modal';

interface AddTeamToProfileDialogProps {
  availableTeams: Team[];
  spriteCacheState?: UseSpriteCacheReturn;
  onAddTeam: (teamId: string) => Promise<boolean>;
  onClose: () => void;
}

function TeamSpriteStrip({
  team,
  spriteCacheState,
}: {
  team: Team;
  spriteCacheState?: UseSpriteCacheReturn;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 6 }, (_, idx) => team.pokemon[idx]).map((p, idx) => {
        if (!p) return null;
        const megaApiSlug = getMegaApiSlug(p.showdownData.item, p.showdownData.species);
        const megaSprite = megaApiSlug ? getCachedMegaSprite(megaApiSlug) : null;
        const rawSpriteUrl = megaSprite
          ? p.showdownData.shiny
            ? megaSprite.shinySpriteUrl
            : megaSprite.spriteUrl
          : getPixelSpriteUrl(
              p.pokedexNumber,
              p.showdownData.species,
              p.showdownData.gender || 'M',
              p.showdownData.shiny,
            );
        const spriteUrl = spriteCacheState
          ? spriteCacheState.resolveSprite(rawSpriteUrl)
          : rawSpriteUrl;
        return (
          <img
            key={idx}
            src={spriteUrl}
            alt={p.showdownData.species}
            className="w-10 h-10 object-contain [image-rendering:pixelated] shrink-0"
          />
        );
      })}
    </div>
  );
}

export default function AddTeamToProfileDialog({
  availableTeams,
  spriteCacheState,
  onAddTeam,
  onClose,
}: AddTeamToProfileDialogProps) {
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (team: Team) => {
    if (pendingTeamId) return;
    setPendingTeamId(team.id);
    setError(null);
    const success = await onAddTeam(team.id);
    if (success) {
      onClose();
    } else {
      setError('Failed to add - please try again');
      setPendingTeamId(null);
    }
  };

  return (
    <Modal panelClassName="max-w-2xl max-h-[85vh]">
      <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Add Team</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
        {availableTeams.length === 0 ? (
          <p className="text-sm text-zinc-400">No other teams to add.</p>
        ) : (
          availableTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => handlePick(team)}
              disabled={pendingTeamId !== null}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-zinc-700 border border-zinc-600 rounded-lg text-left transition-colors enabled:hover:border-accent-gold enabled:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                {team.name || 'Untitled Team'}
              </span>
              <div className="shrink-0">
                <TeamSpriteStrip team={team} spriteCacheState={spriteCacheState} />
              </div>
            </button>
          ))
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
