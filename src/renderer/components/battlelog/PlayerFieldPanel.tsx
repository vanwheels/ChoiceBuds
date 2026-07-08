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

/**
 * Read-only text cell - the player's own set is fixed at battle start, so there's nothing to
 * edit here (unlike the opponent's equivalent select/input cells in OpponentRowFields.tsx). Boxed
 * with the same padding/border/rounding as those form controls (a dimmer, non-interactive shade of
 * the same look) so both sides' rows occupy the same per-cell footprint instead of the player's
 * plain unboxed text collapsing to a smaller height.
 */
function StaticCell({ value }: { value?: string }) {
  return (
    <span
      className="block w-full px-1 py-0 leading-4 text-[10px] bg-gray-900/60 border border-gray-800 rounded text-gray-400 truncate"
      title={value}
    >
      {value || '—'}
    </span>
  );
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
