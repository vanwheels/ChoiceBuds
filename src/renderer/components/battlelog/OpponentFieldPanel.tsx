/**
 * OpponentFieldPanel.tsx - Opponent Roster, Built Incrementally
 * Variable-length over battle.opponentRoster (starts empty). Reuses
 * SpeciesPickerCard as-is for the "+ Add opponent Pokemon" quick-add, same
 * open/close toggle TeamCard's own add-slot button already uses.
 */

import { useState } from 'react';
import type { SpeciesRosterEntry, Battle } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { toRegulationId } from '../../utils/pokemonRules';
import SpeciesPickerCard from '../SpeciesPickerCard';
import OpponentInfoTags from './OpponentInfoTags';

interface OpponentFieldPanelProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
}

export default function OpponentFieldPanel({ battle, battleLogActions, roster, resolveSprite }: OpponentFieldPanelProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const toggleActive = (id: string) => {
    const isActive = battle.opponentActiveIds.includes(id);
    const next = isActive
      ? battle.opponentActiveIds.filter(activeId => activeId !== id)
      : battle.opponentActiveIds.length < 2 ? [...battle.opponentActiveIds, id] : battle.opponentActiveIds;
    battleLogActions.setActive(battle, 'opponent', next);
  };

  const toggleFainted = (id: string, currentlyFainted: boolean) => {
    battleLogActions.setFainted(battle, 'opponent', id, !currentlyFainted);
  };

  const handleAddSpecies = (species: SpeciesRosterEntry) => {
    setIsAddOpen(false);
    battleLogActions.addOpponentPokemon(battle, species);
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-bold text-red-400 uppercase tracking-wide">Opponent</h3>
      <div className="flex flex-col gap-2">
        {battle.opponentRoster.map(o => {
          const isActive = battle.opponentActiveIds.includes(o.id);

          return (
            <div
              key={o.id}
              className={`p-2 rounded-lg border-2 transition-colors ${
                o.fainted ? 'border-gray-800 bg-gray-900/40 opacity-40' : isActive ? 'border-red-500 bg-red-600/20' : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(o.id)}
                  disabled={o.fainted}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer disabled:cursor-not-allowed"
                  title={isActive ? 'Active - click to bench' : 'Click to mark active'}
                >
                  <img src={resolveSprite(o.spriteUrl)} alt={o.species} className="w-10 h-10 object-contain [image-rendering:pixelated] shrink-0" />
                  <span className="text-xs text-gray-100 truncate">{o.species}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFainted(o.id, o.fainted)}
                  title={o.fainted ? 'Fainted - click to revive' : 'Mark fainted'}
                  className="text-sm shrink-0 opacity-70 hover:opacity-100 cursor-pointer"
                >
                  💀
                </button>
              </div>
              <OpponentInfoTags battle={battle} opponent={o} battleLogActions={battleLogActions} />
            </div>
          );
        })}

        {isAddOpen ? (
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
        )}
      </div>
    </div>
  );
}
