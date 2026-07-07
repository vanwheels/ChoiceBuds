/**
 * PlayerFieldPanel.tsx - My Full 6-Pokemon Roster
 * Thin wrapper over TeamRosterColumn: maps playerRoster into RosterRowData
 * and wires the brought/fainted mutations. A row's main click toggles
 * brought status (capped at 4, useBattleLogActions.toggleBrought enforces
 * it) - active-switching now happens entirely via Battlefield.tsx, so
 * isActive here just drives the highlighted-border visual, read-only.
 */

import type { Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import TeamRosterColumn, { type RosterRowData } from './TeamRosterColumn';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';

interface PlayerFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  resolveSprite: (remoteUrl: string) => string;
}

export default function PlayerFieldPanel({ battle, battleLogActions, resolveSprite }: PlayerFieldPanelProps) {
  const toggleFainted = (id: string) => {
    battleLogActions.setFainted(battle, 'player', id, !battle.playerFaintedIds.includes(id));
  };

  const rows: RosterRowData[] = battle.playerRoster.map(p => ({
    id: p.id,
    species: p.species,
    displayName: p.nickname || p.species,
    spriteUrl: getPixelSpriteUrl(p.pokedexNumber, p.species, p.gender || 'M', false),
    isBrought: battle.broughtIds.includes(p.id),
    isActive: battle.playerActiveIds.includes(p.id),
    isFainted: battle.playerFaintedIds.includes(p.id),
  }));

  return (
    <TeamRosterColumn
      title="My Team"
      titleColorClass="text-blue-400"
      activeColorClass="border-blue-500 bg-blue-600/20"
      rows={rows}
      resolveSprite={resolveSprite}
      onRowClick={id => battleLogActions.toggleBrought(battle, id)}
      onToggleFainted={toggleFainted}
      enableDrag
    />
  );
}
