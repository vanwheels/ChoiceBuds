/**
 * OpponentInfoTags.tsx - Live Scouting Tags for One Opponent Pokemon
 * The "Meowstic: Yawn, Prankster" panel - simple editable/growable tags
 * filled in as revealed during the battle. Ephemeral, per-battle only.
 */

import { useState, useEffect } from 'react';
import type { Battle, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { getSwitchInEffect } from '../../config/onSwitchInAbilities';
import { hasAppliedAbilityEffectSinceSwitchIn } from '../../utils/battleLookup';
import { VGC_ITEMS, isConsumableItem } from '../../config/vgcData';

interface OpponentInfoTagsProps {
  battle: Battle;
  opponent: OpponentPokemonEntry;
  battleLogActions: UseBattleLogActionsReturn;
  gameDataState: UseGameDataReturn;
}

/** "sand-stream" -> "Sand Stream" - AbilityData.name is a normalized lowercase-hyphenated slug. */
function formatAbilityName(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export default function OpponentInfoTags({ battle, opponent, battleLogActions, gameDataState }: OpponentInfoTagsProps) {
  const [item, setItem] = useState(opponent.item || '');
  const [newMove, setNewMove] = useState('');
  const [legalAbilities, setLegalAbilities] = useState<string[]>([]);

  // Item stays a local draft (so typing doesn't commit on every keystroke),
  // but the underlying value can also change from elsewhere - the Mega
  // button auto-revealing it - without this the input would keep showing
  // a stale value after a mount.
  useEffect(() => { setItem(opponent.item || ''); }, [opponent.item]);

  // Real possible abilities for this species (same call the Team Builder's
  // own ability picker uses - see EditOverlays.tsx), not a freeform guess.
  useEffect(() => {
    let cancelled = false;
    gameDataState.getEnrichedSpeciesOptions(opponent.species).then(({ abilities }) => {
      if (!cancelled) setLegalAbilities(abilities.map(a => formatAbilityName(a.name)));
    });
    return () => { cancelled = true; };
  }, [opponent.species, gameDataState]);

  const commitItem = () => {
    battleLogActions.updateOpponentMoveTags(battle, opponent.id, opponent.ability || undefined, item || undefined);
  };

  const handleAbilityChange = (value: string) => {
    battleLogActions.updateOpponentMoveTags(battle, opponent.id, value || undefined, opponent.item || undefined);
  };

  // Covers the case where the ability is revealed after the Pokemon is
  // already active (not just at switch-in, which Battlefield.tsx's own
  // chip already covers) - e.g. typed in from Team Preview scouting notes.
  const committedAbility = opponent.ability;
  const switchInEffect = getSwitchInEffect(committedAbility);
  const showAbilityChip = battle.opponentActiveIds.includes(opponent.id)
    && !!switchInEffect && !!committedAbility
    && !hasAppliedAbilityEffectSinceSwitchIn(battle, opponent.id, committedAbility);

  const submitMove = () => {
    if (!newMove.trim()) return;
    battleLogActions.addOpponentMove(battle, opponent.id, newMove);
    setNewMove('');
  };

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex flex-wrap gap-1">
        {opponent.moves.map(move => (
          <span key={move} className="flex items-center gap-1 text-[10px] bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded">
            {move}
            <button
              type="button"
              onClick={() => battleLogActions.removeOpponentMove(battle, opponent.id, move)}
              className="text-gray-400 hover:text-red-400 cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={newMove}
        onChange={e => setNewMove(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submitMove(); }}
        onBlur={submitMove}
        placeholder="+ move seen"
        className="w-full px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
      />
      <div className="grid grid-cols-2 gap-1">
        <select
          value={committedAbility && legalAbilities.includes(committedAbility) ? committedAbility : (committedAbility || '')}
          onChange={e => handleAbilityChange(e.target.value)}
          className="px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="">ability</option>
          {committedAbility && !legalAbilities.includes(committedAbility) && (
            <option value={committedAbility}>{committedAbility}</option>
          )}
          {legalAbilities.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="text"
          list="opponent-item-suggestions"
          value={item}
          onChange={e => setItem(e.target.value)}
          onBlur={commitItem}
          placeholder="item"
          className="px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />
      </div>
      <datalist id="opponent-item-suggestions">
        {VGC_ITEMS.map(name => <option key={name} value={name} />)}
      </datalist>

      {isConsumableItem(opponent.item) && (
        <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={!!opponent.itemConsumed}
            onChange={e => battleLogActions.setItemConsumed(battle, opponent.id, e.target.checked)}
            className="cursor-pointer"
          />
          Consumed
        </label>
      )}

      {showAbilityChip && (
        <button
          type="button"
          onClick={() => battleLogActions.applyAbilityEffect(battle, 'opponent', opponent.id, committedAbility!)}
          title="Apply this ability's switch-in effect"
          className="self-start text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
        >
          {committedAbility}!
        </button>
      )}
    </div>
  );
}
