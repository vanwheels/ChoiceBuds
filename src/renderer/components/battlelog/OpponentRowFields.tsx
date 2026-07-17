/**
 * OpponentRowFields.tsx - Live Scouting Controls for One Opponent Pokemon,
 * Split Into RosterRow's Grid Cells
 * Replaces the old OpponentInfoTags.tsx single block: the compact
 * Sprite+Name / Ability|Move1+Move2 / Item|Move3+Move4 layout (see
 * RosterRow.tsx) needs these interleaved into specific grid cells rather
 * than appended below the row, so each piece is its own small real
 * component (own hooks where needed) instead of one big div - same
 * Rules-of-Hooks reasoning as RosterRow.tsx/BattlefieldSlot.tsx's own
 * extraction (each is instantiated via JSX inside OpponentFieldPanel.tsx's
 * row-building .map(), never hook-called directly inside that callback).
 *
 * Moves fill the 4 grid cells sequentially as they're revealed - the next
 * empty cell (index === opponent.moves.length) doubles as the "add a move"
 * input, so there's no separate free-standing input row. `opponent.moves`
 * has no hard cap in the data model (a user could over-log by mistake), so
 * OpponentExtras defensively surfaces any 5th+ entry that wouldn't
 * otherwise be visible.
 */

import { useState, useEffect } from 'react';
import type { Battle, OpponentPokemonEntry, ChampionsUsageEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { getSwitchInEffect } from '../../config/onSwitchInAbilities';
import { hasAppliedAbilityEffectSinceSwitchIn } from '../../utils/battleLookup';
import { isConsumableItem } from '../../config/vgcData';
import LikelySetsPopover from './LikelySetsPopover';

interface RowFieldProps {
  battle: Battle;
  opponent: OpponentPokemonEntry;
  battleLogActions: UseBattleLogActionsReturn;
}

/** "sand-stream" -> "Sand Stream" - AbilityData.name is a normalized lowercase-hyphenated slug. */
export function formatAbilityName(slug: string): string {
  return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const cellSelectClass = 'block w-full px-1 py-0 leading-4 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500';

export function OpponentAbilityCell({ battle, opponent, battleLogActions, gameDataState }: RowFieldProps & { gameDataState: UseGameDataReturn }) {
  const [legalAbilities, setLegalAbilities] = useState<string[]>([]);

  // Real possible abilities for this species (same call the Team Builder's own ability picker uses), not a freeform guess.
  useEffect(() => {
    let cancelled = false;
    gameDataState.getEnrichedSpeciesOptions(opponent.species).then(({ abilities }) => {
      if (!cancelled) setLegalAbilities(abilities.map(a => formatAbilityName(a.name)));
    });
    return () => { cancelled = true; };
  }, [opponent.species, gameDataState]);

  const committedAbility = opponent.ability;
  return (
    <select
      value={committedAbility && legalAbilities.includes(committedAbility) ? committedAbility : (committedAbility || '')}
      onChange={e => battleLogActions.updateOpponentMoveTags(battle, opponent.id, e.target.value || undefined, opponent.item || undefined)}
      className={cellSelectClass}
      title="Ability"
    >
      <option value="">ability</option>
      {committedAbility && !legalAbilities.includes(committedAbility) && (
        <option value={committedAbility}>{committedAbility}</option>
      )}
      {legalAbilities.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
  );
}

export function OpponentItemCell({ battle, opponent, battleLogActions }: RowFieldProps) {
  const [item, setItem] = useState(opponent.item || '');

  // Local draft (so typing doesn't commit on every keystroke), but the underlying value can also
  // change from elsewhere (the Mega button auto-revealing it) - without this the input would keep
  // showing a stale value after mount. Set during render rather than in an effect - see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedItem, setSyncedItem] = useState(opponent.item);
  if (opponent.item !== syncedItem) {
    setSyncedItem(opponent.item);
    setItem(opponent.item || '');
  }

  return (
    <input
      type="text"
      list="opponent-item-suggestions"
      value={item}
      onChange={e => setItem(e.target.value)}
      onBlur={() => battleLogActions.updateOpponentMoveTags(battle, opponent.id, opponent.ability || undefined, item || undefined)}
      placeholder="item"
      className={cellSelectClass}
      title="Item"
    />
  );
}

export function OpponentMoveCell({ battle, opponent, battleLogActions, index }: RowFieldProps & { index: number }) {
  const [draft, setDraft] = useState('');
  const move = opponent.moves[index];

  if (move) {
    return (
      <span className="flex items-center justify-between gap-1 leading-4 text-[10px] bg-gray-700 text-gray-200 px-1 rounded truncate">
        <span className="truncate">{move}</span>
        <button
          type="button"
          onClick={() => battleLogActions.removeOpponentMove(battle, opponent.id, move)}
          className="text-gray-400 hover:text-red-400 cursor-pointer shrink-0"
        >
          ×
        </button>
      </span>
    );
  }

  // Only the next empty slot doubles as the add-move input - later empty slots stay blank until it's their turn.
  if (index !== opponent.moves.length) return <span className="block text-[10px] text-gray-700">—</span>;

  const submit = () => {
    if (!draft.trim()) return;
    battleLogActions.addOpponentMove(battle, opponent.id, draft);
    setDraft('');
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      onBlur={submit}
      placeholder="+ move"
      className={cellSelectClass}
    />
  );
}

export function OpponentExtras({ battle, opponent, battleLogActions }: RowFieldProps) {
  const committedAbility = opponent.ability;
  const switchInEffect = getSwitchInEffect(committedAbility);
  const showAbilityChip = battle.opponentActiveIds.includes(opponent.id)
    && !!switchInEffect && !!committedAbility
    && !hasAppliedAbilityEffectSinceSwitchIn(battle, opponent.id, committedAbility);
  const overflowMoves = opponent.moves.slice(4);

  if (!isConsumableItem(opponent.item) && !showAbilityChip && overflowMoves.length === 0) return null;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {overflowMoves.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {overflowMoves.map(move => (
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
      )}

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

/**
 * Ranked-usage "likely set" suggestion trigger (see LikelySetsPopover.tsx) -
 * fetches on mount/species-change, same effect-on-mount pattern as
 * OpponentAbilityCell above. Renders nothing while the fetch is in flight,
 * on a species with no Champions usage page, or once every suggestible
 * category is already confirmed (v1: just Ability) - a guess that adds
 * nothing never earns screen space.
 */
export function OpponentLikelySetsTrigger({ opponent, gameDataState }: { opponent: OpponentPokemonEntry; gameDataState: UseGameDataReturn }) {
  const [usage, setUsage] = useState<ChampionsUsageEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gameDataState.getChampionsUsage(opponent.species).then(result => {
      if (!cancelled) setUsage(result);
    });
    return () => { cancelled = true; };
  }, [opponent.species, gameDataState]);

  // v1 only has an Ability section - once it's confirmed (or there's nothing
  // to suggest in the first place) a guess adds nothing, so hide entirely.
  if (!usage || usage.abilities.length === 0 || opponent.ability) return null;

  return (
    <div className="relative inline-block mt-1">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        title="Likely set (ranked usage, unconfirmed)"
        className="text-[9px] px-1.5 py-0.5 rounded border border-dashed border-amber-700 text-amber-400 hover:bg-amber-900/30 cursor-pointer"
      >
        📊 Likely Set
      </button>
      {isOpen && <LikelySetsPopover usage={usage} hideAbility={false} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
