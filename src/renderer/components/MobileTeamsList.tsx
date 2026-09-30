/**
 * MobileTeamsList.tsx - Compact Team-Preview List (Mobile Teams Page)
 *
 * Full-Screen Swipeable Pokémon Card + Teams List View Leg 1 (see TODO.md's
 * scoping doc) - renders instead of TeamsPage.tsx's desktop TeamCard grid
 * below `md`, one MobileTeamRow.tsx per team. Owns which team's swipe deck
 * (MobileTeamSwipeOverlay.tsx) is currently open, always starting at index 0
 * per the scoping decision ("Tapping a team opens a full-screen overlay...") -
 * there's no per-Pokémon entry point from this list, only Box's compact grid
 * (Box Mobile: Compact Grid + Swipe Deck leg) pages in from a specific tile.
 *
 * No drag-reorder here (out of scope per the scoping doc - only "name/
 * format/small sprite strip" was specified) - `teams` is rendered in
 * whatever order TeamsPage.tsx's own favorite-then-custom sort already
 * produced, same as the desktop grid without its Reorder.Group.
 */

import { useState } from 'react';
import type { Team } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../hooks/useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from '../hooks/useVgcRealSetsCache';
import { useMegaSpritePrefetch } from '../hooks/useMegaSprite';
import MobileTeamRow from './MobileTeamRow';
import MobileTeamSwipeOverlay from './MobileTeamSwipeOverlay';

interface MobileTeamsListProps {
  teams: Team[];
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  savedPokemonState: UseSavedPokemonReturn;
  vgcPastesState: UseVgcPastesCacheReturn;
  vgcRealSetsState: UseVgcRealSetsCacheReturn;
}

export default function MobileTeamsList({ teams, teamsState, databaseState, gameDataState, speciesRosterState, spriteCacheState, settingsState, savedPokemonState, vgcPastesState, vgcRealSetsState }: MobileTeamsListProps) {
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  // Warms the shared Mega-sprite cache once for the whole list's sprite
  // strips - see TeamCard.tsx's own per-card call of the same hook for why
  // this is safe to call from more than one place at once.
  useMegaSpritePrefetch();

  const openTeam = openTeamId ? teams.find(t => t.id === openTeamId) ?? null : null;

  return (
    <div className="flex flex-col gap-2">
      {teams.map(team => (
        <MobileTeamRow
          key={team.id}
          team={team}
          teamsState={teamsState}
          gameDataState={gameDataState}
          settingsState={settingsState}
          spriteCacheState={spriteCacheState}
          onOpen={() => setOpenTeamId(team.id)}
        />
      ))}

      {openTeam && (
        <MobileTeamSwipeOverlay
          team={openTeam}
          initialIndex={0}
          updateTeam={teamsState.updateTeam}
          databaseState={databaseState}
          gameDataState={gameDataState}
          speciesRosterState={speciesRosterState}
          spriteCacheState={spriteCacheState}
          savedPokemonState={savedPokemonState}
          vgcPastesState={vgcPastesState}
          vgcRealSetsState={vgcRealSetsState}
          showAnimatedSprites={settingsState.settings.showAnimatedSprites}
          onClose={() => setOpenTeamId(null)}
        />
      )}
    </div>
  );
}
