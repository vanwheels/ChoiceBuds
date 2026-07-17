/**
 * OpponentFieldPanel.tsx - Opponent Roster, Built Incrementally (Capped at 6)
 * Thin wrapper over TeamRosterColumn - no "brought" concept here (every
 * revealed opponent Pokemon is by definition one they've used), just
 * active/fainted plus the per-mon scouting controls (OpponentRowFields.tsx,
 * slotted into the shared Ability|Moves/Item|Moves grid). Reuses
 * SpeciesPickerCard as-is for the "+ Add opponent Pokemon" quick-add, same
 * open/close toggle TeamCard's own add-slot button already uses.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { SpeciesRosterEntry, Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { MAX_OPPONENT_ROSTER_SIZE } from '../../hooks/useBattleLogActions';
import { toRegulationId } from '../../utils/pokemonRules';
import { VGC_ITEMS } from '../../config/vgcData';
import SpeciesPickerCard from '../SpeciesPickerCard';
import { OpponentAbilityCell, OpponentItemCell, OpponentMoveCell, OpponentExtras, OpponentLikelySetsTrigger } from './OpponentRowFields';
import TeamRosterColumn, { type RosterRowData } from './TeamRosterColumn';

interface OpponentFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
  gameDataState: UseGameDataReturn;
}

export default function OpponentFieldPanel({ battle, battleLogActions, roster, resolveSprite, gameDataState }: OpponentFieldPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const isFull = battle.opponentRoster.length >= MAX_OPPONENT_ROSTER_SIZE;

  const handleAddSpecies = (species: SpeciesRosterEntry) => {
    setIsAddOpen(false);
    battleLogActions.addOpponentPokemon(battle, species);
  };

  const rows: RosterRowData[] = battle.opponentRoster.map(o => ({
    id: o.id,
    species: o.species,
    displayName: o.species,
    spriteUrl: o.spriteUrl,
    item: o.item,
    isMega: battle.megaEvolvedIds.includes(o.id),
    isActive: battle.opponentActiveIds.includes(o.id),
    isFainted: o.fainted,
    ability: <OpponentAbilityCell battle={battle} opponent={o} battleLogActions={battleLogActions} gameDataState={gameDataState} />,
    itemDisplay: <OpponentItemCell battle={battle} opponent={o} battleLogActions={battleLogActions} />,
    moves: [0, 1, 2, 3].map(i => (
      <OpponentMoveCell key={i} index={i} battle={battle} opponent={o} battleLogActions={battleLogActions} />
    )) as [ReactNode, ReactNode, ReactNode, ReactNode],
    extra: (
      <>
        <OpponentLikelySetsTrigger opponent={o} gameDataState={gameDataState} />
        <OpponentExtras battle={battle} opponent={o} battleLogActions={battleLogActions} />
      </>
    ),
  }));

  return (
    <>
      {/* Shared across every OpponentItemCell (list="..." can be referenced by any number of inputs) - one instance instead of one per row. */}
      <datalist id="opponent-item-suggestions">
        {VGC_ITEMS.map(name => <option key={name} value={name} />)}
      </datalist>
      <TeamRosterColumn
        title={`Opponent (${battle.opponentRoster.length}/${MAX_OPPONENT_ROSTER_SIZE})`}
        titleColorClass="text-red-400"
        activeColorClass="border-red-500 bg-red-600/20"
        side="opponent"
        rows={rows}
        resolveSprite={resolveSprite}
        onRowClick={() => {}}
        enableDrag
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
    </>
  );
}
