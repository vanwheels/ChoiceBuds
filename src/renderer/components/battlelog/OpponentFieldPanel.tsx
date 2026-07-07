/**
 * OpponentFieldPanel.tsx - Opponent Roster, Built Incrementally (Capped at 6)
 * Thin wrapper over TeamRosterColumn - no "brought" concept here (every
 * revealed opponent Pokemon is by definition one they've used), just
 * active/fainted plus the per-mon OpponentInfoTags scouting notes. Reuses
 * SpeciesPickerCard as-is for the "+ Add opponent Pokemon" quick-add, same
 * open/close toggle TeamCard's own add-slot button already uses.
 */

import { useState } from 'react';
import type { SpeciesRosterEntry, Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { MAX_OPPONENT_ROSTER_SIZE } from '../../hooks/useBattleLogActions';
import { toRegulationId } from '../../utils/pokemonRules';
import SpeciesPickerCard from '../SpeciesPickerCard';
import OpponentInfoTags from './OpponentInfoTags';
import TeamRosterColumn, { type RosterRowData } from './TeamRosterColumn';

interface OpponentFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
}

export default function OpponentFieldPanel({ battle, battleLogActions, roster, resolveSprite }: OpponentFieldPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isFull = battle.opponentRoster.length >= MAX_OPPONENT_ROSTER_SIZE;

  const toggleActive = (id: string) => {
    const isActive = battle.opponentActiveIds.includes(id);
    const next = isActive
      ? battle.opponentActiveIds.filter(activeId => activeId !== id)
      : battle.opponentActiveIds.length < 2 ? [...battle.opponentActiveIds, id] : battle.opponentActiveIds;
    battleLogActions.setActive(battle, 'opponent', next);
  };

  const toggleFainted = (id: string) => {
    const opponent = battle.opponentRoster.find(o => o.id === id);
    if (!opponent) return;
    battleLogActions.setFainted(battle, 'opponent', id, !opponent.fainted);
  };

  const handleAddSpecies = (species: SpeciesRosterEntry) => {
    setIsAddOpen(false);
    battleLogActions.addOpponentPokemon(battle, species);
  };

  const rows: RosterRowData[] = battle.opponentRoster.map(o => ({
    id: o.id,
    species: o.species,
    displayName: o.species,
    spriteUrl: o.spriteUrl,
    isActive: battle.opponentActiveIds.includes(o.id),
    isFainted: o.fainted,
    extra: <OpponentInfoTags battle={battle} opponent={o} battleLogActions={battleLogActions} />,
  }));

  return (
    <TeamRosterColumn
      title={`Opponent (${battle.opponentRoster.length}/${MAX_OPPONENT_ROSTER_SIZE})`}
      titleColorClass="text-red-400"
      activeColorClass="border-red-500 bg-red-600/20"
      rows={rows}
      resolveSprite={resolveSprite}
      onRowClick={toggleActive}
      onToggleFainted={toggleFainted}
      addSlot={
        isFull ? null : isAddOpen ? (
          <SpeciesPickerCard
            roster={roster}
            rulesetId={toRegulationId(battle.format)}
            resolveSprite={resolveSprite}
            onSelect={handleAddSpecies}
            onClose={() => setIsAddOpen(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-xs"
          >
            + Add Opponent Pokemon
          </button>
        )
      }
    />
  );
}
