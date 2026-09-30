/**
 * MobileTeamRow.tsx - Compact Mobile Team-Preview List Row
 *
 * Full-Screen Swipeable Pokémon Card + Teams List View Leg 1 (see TODO.md's
 * scoping doc) - "a compact team-preview list (name/format/small sprite
 * strip, no inline Pokémon grid) that opens it on tap." Replaces
 * TeamCard.tsx's own header entirely below `md` (rendered instead of it,
 * not a responsive variant of it) - tapping the row opens
 * MobileTeamSwipeOverlay.tsx at index 0; the regulation badge, favorite
 * star, and overflow menu are pulled in as-is from the desktop header so
 * rename/format/export/delete stay reachable without duplicating that logic.
 *
 * Export/Export Image/Export PDF modals are owned here (not
 * MobileTeamSwipeOverlay.tsx) since TeamOverflowMenu only calls back with
 * "open this modal" - same split TeamCard.tsx already uses for the same menu.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Team } from '../types/pokemon';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { toRegulationId } from '../utils/pokemonRules';
import { getRegulationTheme } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getMegaApiSlug } from '../config/megaEvolution';
import { getCachedMegaSprite } from '../hooks/useMegaSprite';
import RegulationBadge from './RegulationBadge';
import TeamOverflowMenu from './TeamOverflowMenu';
import ExportTeamModal from './ExportTeamModal';
import TeamExportImageModal from './TeamExportImageModal';
import TeamSheetPdfModal from './TeamSheetPdfModal';

interface MobileTeamRowProps {
  team: Team;
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  settingsState: UseSettingsReturn;
  spriteCacheState: UseSpriteCacheReturn;
  onOpen: () => void;
}

export default function MobileTeamRow({ team, teamsState, gameDataState, settingsState, spriteCacheState, onOpen }: MobileTeamRowProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImageExportOpen, setIsImageExportOpen] = useState(false);
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const { updateTeam, deleteTeam } = teamsState;
  const regulationTheme = getRegulationTheme(toRegulationId(team.format));

  // stopPropagation on every interactive child below keeps a tap on the
  // badge/star/overflow trigger from also bubbling into the row's own
  // onOpen - only a tap on genuinely empty row space should open the deck.
  const stop = (e: ReactMouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onOpen}
      className={`flex items-center gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 border-l-4 ${regulationTheme.accentBorder} rounded-xl cursor-pointer active:bg-zinc-800/60 transition-colors`}
    >
      <div onClick={stop} className="shrink-0">
        <RegulationBadge team={team} onChange={(format) => updateTeam(team.id, { format })} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="font-bold text-sm text-zinc-100 truncate">{team.name || 'Untitled Team'}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: 6 }, (_, idx) => team.pokemon?.[idx]).map((p, idx) => {
            if (!p) return null;
            const megaApiSlug = getMegaApiSlug(p.showdownData.item, p.showdownData.species);
            const megaSprite = megaApiSlug ? getCachedMegaSprite(megaApiSlug) : null;
            const spriteUrl = megaSprite
              ? (p.showdownData.shiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl)
              : getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny);
            return (
              <img
                key={idx}
                src={spriteCacheState.resolveSprite(spriteUrl)}
                alt={p.showdownData.species}
                className="w-6 h-6 object-contain [image-rendering:pixelated] shrink-0"
              />
            );
          })}
        </div>
      </div>

      <button
        onClick={(e) => { stop(e); updateTeam(team.id, { favorite: !team.favorite }); }}
        title={team.favorite ? 'Unfavorite' : 'Favorite'}
        className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          team.favorite ? 'text-accent-gold' : 'text-zinc-500'
        }`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill={team.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      </button>

      <div onClick={stop} className="shrink-0">
        <TeamOverflowMenu
          team={team}
          rulesetId={toRegulationId(team.format)}
          onExport={() => setIsExportOpen(true)}
          onExportImage={() => setIsImageExportOpen(true)}
          onExportPdf={() => setIsPdfExportOpen(true)}
          onDelete={() => deleteTeam(team.id)}
        />
      </div>

      <AnimatePresence>
        {isExportOpen && (
          <ExportTeamModal
            pokemonList={team.pokemon.map(p => p.showdownData)}
            title="Export Team"
            pasteTitle={team.name}
            pasteAuthor={team.author}
            pasteNotes={team.notes}
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImageExportOpen && (
          <TeamExportImageModal
            team={team}
            gameDataState={gameDataState}
            spriteCacheState={spriteCacheState}
            onClose={() => setIsImageExportOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPdfExportOpen && (
          <TeamSheetPdfModal
            team={team}
            teamsState={teamsState}
            settingsState={settingsState}
            onClose={() => setIsPdfExportOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
