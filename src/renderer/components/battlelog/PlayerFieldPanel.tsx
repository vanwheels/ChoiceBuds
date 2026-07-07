/**
 * PlayerFieldPanel.tsx - My Full 6-Pokemon Roster
 * Thin wrapper over TeamRosterColumn: maps playerRoster into RosterRowData
 * and wires the brought/active/fainted mutations. Brought is capped at 4
 * (useBattleLogActions.toggleBrought enforces it); a row's main click only
 * toggles active (capped at 2, doubles-appropriate) and is a no-op until
 * the mon has been brought via the small corner control.
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
  const toggleActive = (id: string) => {
    if (!battle.broughtIds.includes(id)) return;
    const isActive = battle.playerActiveIds.includes(id);
    const next = isActive
      ? battle.playerActiveIds.filter(activeId => activeId !== id)
      : battle.playerActiveIds.length < 2 ? [...battle.playerActiveIds, id] : battle.playerActiveIds;
    battleLogActions.setActive(battle, 'player', next);
  };

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
      onRowClick={toggleActive}
      onToggleBrought={id => battleLogActions.toggleBrought(battle, id)}
      onToggleFainted={toggleFainted}
    />
  );
}
