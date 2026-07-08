/**
 * PlayerFieldPanel.tsx - My Full 6-Pokemon Roster
 * Thin wrapper over TeamRosterColumn: maps playerRoster into RosterRowData
 * and wires the brought/fainted mutations. A row's main click toggles
 * brought status (capped at 4, useBattleLogActions.toggleBrought enforces
 * it) - active-switching now happens entirely via Battlefield.tsx, so
 * isActive here just drives the highlighted-border visual, read-only.
 */

import type { ReactNode } from 'react';
import type { Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import TeamRosterColumn, { type RosterRowData } from './TeamRosterColumn';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';

interface PlayerFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  resolveSprite: (remoteUrl: string) => string;
}

/** Plain, read-only text cell - the player's own set is fixed at battle start, so there's nothing to edit here (unlike the opponent's equivalent cells). */
function StaticCell({ value }: { value?: string }) {
  return <span className="block text-[10px] text-gray-400 truncate" title={value}>{value || '—'}</span>;
}

export default function PlayerFieldPanel({ battle, battleLogActions, resolveSprite }: PlayerFieldPanelProps) {
  const rows: RosterRowData[] = battle.playerRoster.map(p => ({
    id: p.id,
    species: p.species,
    displayName: p.nickname || p.species,
    spriteUrl: getPixelSpriteUrl(p.pokedexNumber, p.species, p.gender || 'M', false),
    item: p.item,
    isMega: battle.megaEvolvedIds.includes(p.id),
    isBrought: battle.broughtIds.includes(p.id),
    isActive: battle.playerActiveIds.includes(p.id),
    isFainted: battle.playerFaintedIds.includes(p.id),
    ability: <StaticCell value={p.ability} />,
    itemDisplay: <StaticCell value={p.item} />,
    moves: [0, 1, 2, 3].map(i => <StaticCell key={i} value={p.moves[i]} />) as [ReactNode, ReactNode, ReactNode, ReactNode],
  }));

  return (
    <TeamRosterColumn
      title="My Team"
      titleColorClass="text-blue-400"
      activeColorClass="border-blue-500 bg-blue-600/20"
      side="player"
      rows={rows}
      resolveSprite={resolveSprite}
      onRowClick={id => battleLogActions.toggleBrought(battle, id)}
      enableDrag
    />
  );
}
